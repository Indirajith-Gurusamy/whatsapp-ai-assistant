"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingInput } from "@/components/ui/floating-input";
import { Eye, EyeOff } from "lucide-react";

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, isAuthenticated, user } = useAuth();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Check if user is already logged in
    useEffect(() => {
        if (isAuthenticated && user) {
            router.push(user.role === "ADMIN" ? "/conversations" : "/dashboard");
        }
    }, [isAuthenticated, user, router]);

    const validateField = (name: string, value: string): string | null => {
        switch (name) {
            case "email":
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) return "Invalid email format";
                return null;

            case "password":
                if (value.length < 1) return "Password is required";
                return null;

            default:
                return null;
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // Real-time validation - also clear general error when user types
        const error = validateField(name, value);
        setErrors((prev) => {
            const { general: _, [name]: __, ...rest } = prev;
            if (error) {
                return { ...rest, [name]: error };
            }
            return rest;
        });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all fields
        const newErrors: Record<string, string> = {};
        Object.keys(formData).forEach((key) => {
            const error = validateField(key, formData[key as keyof typeof formData]);
            if (error) newErrors[key] = error;
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            const response = await authApi.login({
                email: formData.email,
                password: formData.password,
            });

            // Use auth context to handle login
            login(
                response.user,
                response.tokens.access_token,
                response.tokens.refresh_token,
                rememberMe
            );

            toast.success(`Welcome back, ${response.user.name}!`);

            // Redirect based on role
            const redirectTo = searchParams.get("redirect") || (response.user.role === "ADMIN" ? "/conversations" : "/dashboard");
            router.push(redirectTo);
        } catch (error: any) {
            // Handle specific error cases
            if (error.message.includes("verify your email")) {
                setErrors({ general: error.message });
                toast.error(
                    <div>
                        <p>{error.message}</p>
                        <button
                            onClick={() => router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`)}
                            className="mt-2 text-sm underline font-semibold"
                        >
                            Resend verification code
                        </button>
                    </div>
                );
            } else if (error.message.includes("deactivated")) {
                setErrors({ general: "Your account has been deactivated. Please contact support." });
                toast.error("Account deactivated");
            } else if (error.message.includes("Invalid email or password")) {
                setErrors({ general: "Invalid email or password" });
                toast.error("Invalid credentials");
            } else {
                setErrors({ general: error.message || "Login failed. Please try again." });
                toast.error(error.message || "Login failed");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-gray-600">Sign in to your account</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* General Error */}
                        {errors.general && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {errors.general}
                            </div>
                        )}

                        {/* Email Field */}
                        <FloatingInput
                            label="Email Address"
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            autoComplete="username"
                            required
                            error={errors.email}
                        />

                        {/* Password Field */}
                        <div className="relative">
                            <FloatingInput
                                label="Password"
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                autoComplete="current-password"
                                required
                                error={errors.password}
                                className="pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition z-10"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                                />
                                <span className="ml-2 text-sm text-gray-700">Remember me</span>
                            </label>
                            <a
                                href={`/forgot-password${formData.email ? `?email=${encodeURIComponent(formData.email)}` : ""}`}
                                className="text-sm text-primary hover:text-primary/90 font-semibold transition"
                            >
                                Forgot Password?
                            </a>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || Object.keys(errors).length > 0}
                            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                    Signing In...
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    {/* Sign Up Link Removed */
                    /* <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            Don't have an account?{" "}
                            <a href="/signup" className="text-purple-600 font-semibold hover:text-purple-700 transition">
                                Sign Up
                            </a>
                        </p>
                    </div> */}
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
                <Skeleton className="h-[500px] w-full max-w-md rounded-2xl" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingInput } from "@/components/ui/floating-input";


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
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "";
            if (message.includes("verify your email")) {
                setErrors({ email: "Your email is not verified. Please verify your email to continue." });
                toast.error(
                    <div>
                        <p>Your email is not verified. Please verify your email to continue.</p>
                        <button
                            onClick={() => router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`)}
                            className="mt-2 text-sm underline font-semibold"
                        >
                            Resend verification code
                        </button>
                    </div>
                );
            } else if (message.includes("deactivated")) {
                setErrors({ email: "Your account has been deactivated. Please contact your administrator." });
                toast.error("Your account has been deactivated. Please contact your administrator for assistance.");
            } else if (message.includes("Invalid email or password")) {
                setErrors({ email: " ", password: "The email or password you entered is incorrect." });
                toast.error("The email or password you entered is incorrect. Please try again.");
            } else if (!message || message === "Failed to fetch") {
                toast.error("Unable to connect to the server. Please check your internet connection.");
            } else {
                toast.error(message);
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

                        {/* Email Field */}
                        <FloatingInput
                            id="email"
                            name="email"
                            label="Email Address *"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            error={errors.email}
                            required
                            autoComplete="email"
                        />

                        {/* Password Field */}
                        <FloatingInput
                            id="password"
                            name="password"
                            label="Password *"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={handleChange}
                            error={errors.password}
                            required
                            autoComplete="current-password"
                            endIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            }
                        />

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
                            disabled={isLoading}
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

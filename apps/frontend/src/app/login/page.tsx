"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
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

        // Real-time validation
        const error = validateField(name, value);
        setErrors((prev) => {
            if (error) {
                return { ...prev, [name]: error };
            } else {
                const { [name]: _, ...rest } = prev;
                return rest;
            }
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8">
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
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 rounded-lg border ${errors.email ? "border-red-500" : "border-gray-300"
                                    } focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition`}
                                placeholder="john@example.com"
                                required
                                autoComplete="email"
                            />
                            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 rounded-lg border ${errors.password ? "border-red-500" : "border-gray-300"
                                        } focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition pr-12`}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
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
                            </div>
                            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                                />
                                <span className="ml-2 text-sm text-gray-700">Remember me</span>
                            </label>
                            <a
                                href={`/forgot-password${formData.email ? `?email=${encodeURIComponent(formData.email)}` : ""}`}
                                className="text-sm text-purple-600 hover:text-purple-700 font-semibold transition"
                            >
                                Forgot Password?
                            </a>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || Object.keys(errors).length > 0}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";
import { themeClasses } from "@/lib/theme";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

function ForgotPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const emailParam = searchParams.get("email");
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [searchParams]);

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!validateEmail(email)) {
            setError("Please enter a valid email address");
            return;
        }

        setIsLoading(true);

        try {
            await authApi.forgotPassword(email);
            setSuccess(true);
            toast.success("Password reset code sent to your email");

            // Store email in sessionStorage for the reset page
            sessionStorage.setItem("reset_email", email);

            // Redirect to reset password page after 2 seconds
            setTimeout(() => {
                router.push(`/reset-password`);
            }, 2000);
        } catch (error: any) {
            setError(error.message || "Failed to send reset code. Please try again.");
            toast.error(error.message || "Failed to send reset code");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Forgot Password?
                        </h1>
                        <p className="text-gray-600">
                            No worries! Enter your email and we'll send you a reset code.
                        </p>
                    </div>

                    {success ? (
                        <div className={`${themeClasses.bgPrimaryLight} border ${themeClasses.borderPrimaryMedium} ${themeClasses.textPrimary} px-4 py-3 rounded-lg text-center`}>
                            <p className="font-semibold mb-1">✓ Code Sent!</p>
                            <p className="text-sm">Check your email for the reset code. Redirecting...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {error}
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
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                    placeholder="john@example.com"
                                    required
                                    autoComplete="email"
                                    autoFocus
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full ${themeClasses.bgPrimaryGradient} ${themeClasses.bgPrimaryGradientHover} text-white py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                        Sending Code...
                                    </>
                                ) : (
                                    "Send Reset Code"
                                )}
                            </button>
                        </form>
                    )}

                    {/* Back to Login Link */}
                    <div className="mt-6 text-center">
                        <a href="/login" className="text-sm text-primary hover:text-primary/90 font-semibold transition inline-flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Login
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
                <Skeleton className="h-96 w-full max-w-md rounded-2xl" />
            </div>
        }>
            <ForgotPasswordContent />
        </Suspense>
    );
}

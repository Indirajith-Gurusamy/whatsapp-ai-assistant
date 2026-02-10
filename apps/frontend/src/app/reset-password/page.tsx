"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { themeClasses } from "@/lib/theme";
import { toast } from "sonner";
import { PasswordStrength } from "@/components/auth/PasswordStrength";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const savedEmail = sessionStorage.getItem("reset_email");
        if (savedEmail) {
            setEmail(savedEmail);
        } else {
            // If no email in session, redirect back to forgot password
            toast.error("Please enter your email again");
            router.push("/forgot-password");
        }
    }, [router]);

    const handleResendCode = async () => {
        if (!email) {
            toast.error("Please enter your email address");
            return;
        }

        setIsResending(true);
        try {
            await authApi.forgotPassword(email);
            toast.success("New code sent to your email");
        } catch (error: any) {
            toast.error(error.message || "Failed to resend code");
        } finally {
            setIsResending(false);
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = "Valid email is required";
        }

        if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
            newErrors.otp = "OTP must be 6 digits";
        }

        if (newPassword.length < 8) {
            newErrors.newPassword = "Password must be at least 8 characters";
        }

        if (newPassword !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            await authApi.resetPassword(email, otp, newPassword);
            setSuccess(true);
            toast.success("Password reset successful!");

            // Clear session storage
            sessionStorage.removeItem("reset_email");

            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (error: any) {
            const errorMessage = error.message || "Failed to reset password";
            setErrors({ general: errorMessage });
            toast.error(errorMessage);
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Reset Password
                        </h1>
                        <p className="text-gray-600">
                            Enter the code sent to your email and create a new password
                        </p>
                    </div>

                    {success ? (
                        <div className={`${themeClasses.bgPrimaryLight} border ${themeClasses.borderPrimaryMedium} ${themeClasses.textPrimary} px-4 py-4 rounded-lg text-center`}>
                            <div className="flex items-center justify-center mb-2">
                                <svg className={`w-12 h-12 ${themeClasses.iconPrimary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="font-semibold text-lg mb-1">Password Reset Successful!</p>
                            <p className="text-sm">Redirecting to login page...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
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
                                    value={email}
                                    readOnly
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                                    placeholder="john@example.com"
                                />
                            </div>

                            {/* OTP Field */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                                        Verification Code
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleResendCode}
                                        disabled={isResending}
                                        className="text-sm text-primary hover:text-primary/90 font-semibold transition disabled:opacity-50"
                                    >
                                        {isResending ? "Sending..." : "Resend Code"}
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    id="otp"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    className={`w-full px-4 py-3 rounded-lg border ${errors.otp ? "border-red-500" : "border-gray-300"} focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-center text-2xl tracking-widest font-mono`}
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                />
                                {errors.otp && <p className="text-red-500 text-sm mt-1">{errors.otp}</p>}
                            </div>

                            {/* New Password Field */}
                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="newPassword"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className={`w-full px-4 py-3 rounded-lg border ${errors.newPassword ? "border-red-500" : "border-gray-300"} focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition pr-12`}
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
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
                                {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>}
                                <PasswordStrength password={newPassword} />
                            </div>

                            {/* Confirm Password Field */}
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-lg border ${errors.confirmPassword ? "border-red-500" : "border-gray-300"} focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition`}
                                    placeholder="••••••••"
                                    required
                                />
                                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
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
                                        Resetting Password...
                                    </>
                                ) : (
                                    "Reset Password"
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

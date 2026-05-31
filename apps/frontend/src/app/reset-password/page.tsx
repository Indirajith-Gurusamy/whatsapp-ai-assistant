"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { themeClasses } from "@/lib/theme";
import { toast } from "sonner";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { FloatingInput } from "@/components/ui/floating-input";
import { Eye, EyeOff } from "lucide-react";
import { getErrorMessage } from "@/lib/utils";
import { RESET_EMAIL_KEY } from "@/lib/auth-storage";

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
        const savedEmail = sessionStorage.getItem(RESET_EMAIL_KEY);
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
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Failed to resend code"));
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
            sessionStorage.removeItem(RESET_EMAIL_KEY);

            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (error: unknown) {
            const errorMessage = getErrorMessage(error, "Failed to reset password");
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
                            <div className="relative">
                                <FloatingInput
                                    label="New Password"
                                    type={showPassword ? "text" : "password"}
                                    id="newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                    error={errors.newPassword}
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
                            {newPassword && <PasswordStrength password={newPassword} />}

                            {/* Confirm Password Field */}
                            <FloatingInput
                                label="Confirm New Password"
                                type={showPassword ? "text" : "password"}
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                                required
                                error={errors.confirmPassword}
                            />

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

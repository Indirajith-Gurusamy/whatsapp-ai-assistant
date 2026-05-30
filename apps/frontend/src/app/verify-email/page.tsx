"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/utils";

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [email, setEmail] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState("");
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        const emailParam = searchParams.get("email");
        if (emailParam) {
            setEmail(emailParam);
        } else {
            setError("Email not provided");
        }
    }, [searchParams]);

    // Countdown timer for resend cooldown
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => {
                setResendCooldown(resendCooldown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) {
            value = value[0];
        }

        if (!/^\d*$/.test(value)) {
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
        const newOtp = [...otp];

        for (let i = 0; i < Math.min(pastedData.length, 6); i++) {
            newOtp[i] = pastedData[i];
        }

        setOtp(newOtp);

        // Focus last filled input
        const lastIndex = Math.min(pastedData.length, 5);
        document.getElementById(`otp-${lastIndex}`)?.focus();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const otpCode = otp.join("");

        if (otpCode.length !== 6) {
            setError("Please enter all 6 digits");
            return;
        }

        if (!email) {
            setError("Email not found");
            return;
        }

        setIsVerifying(true);
        setError("");

        try {
            await authApi.verifyEmail(email, otpCode);
            toast.success("Email verified successfully!");

            setTimeout(() => {
                router.push("/login");
            }, 1500);
        } catch (error: unknown) {
            const message = getErrorMessage(error, "Verification failed");
            setError(message);
            toast.error(message === "Verification failed" ? "Invalid OTP code" : message);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0 || !email) return;

        setIsResending(true);
        setError("");

        try {
            await authApi.resendOtp(email);
            toast.success("Verification code sent!");
            setResendCooldown(30); // 30-second cooldown
            setOtp(["", "", "", "", "", ""]); // Clear OTP inputs
            document.getElementById("otp-0")?.focus();
        } catch (error: unknown) {
            const errorMsg = getErrorMessage(error, "Failed to resend code");
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                                <svg
                                    className="h-8 w-8 text-primary"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Verify Your Email
                        </h1>
                        <p className="text-gray-600">
                            We&apos;ve sent a 6-digit code to
                        </p>
                        <p className="text-primary font-semibold">{email}</p>
                    </div>

                    {/* OTP Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                                Enter Verification Code
                            </label>
                            <div className="flex gap-2 justify-center">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onPaste={handlePaste}
                                        className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                                        required
                                    />
                                ))}
                            </div>
                            {error && (
                                <p className="text-red-500 text-sm mt-3 text-center">{error}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isVerifying || otp.join("").length !== 6}
                            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isVerifying ? (
                                <>
                                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                    Verifying...
                                </>
                            ) : (
                                "Verify Email"
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-gray-600 text-sm">
                            Didn&apos;t receive the code?{" "}
                            <button
                                onClick={handleResend}
                                disabled={resendCooldown > 0 || isResending}
                                className="text-primary font-semibold hover:text-primary/90 transition disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                {isResending
                                    ? "Sending..."
                                    : resendCooldown > 0
                                        ? `Resend (${resendCooldown}s)`
                                        : "Resend"}
                            </button>
                        </p>
                        <p className="text-gray-500 text-xs mt-2">
                            Code expires in 5 minutes
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
                <Skeleton className="h-96 w-full max-w-md rounded-2xl" />
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}

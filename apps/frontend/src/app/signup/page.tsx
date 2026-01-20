"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { toast } from "sonner";

export default function SignupPage() {
    const router = useRouter();
    const [step, setStep] = useState<"signup" | "verify">("signup");
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [emailCheckLoading, setEmailCheckLoading] = useState(false);
    const [emailAvailable, setEmailAvailable] = useState<{ available: boolean; needs_verification: boolean } | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isResending, setIsResending] = useState(false);

    // Debounced email availability check
    useEffect(() => {
        if (!formData.email || errors.email || step === "verify") {
            setEmailAvailable(null);
            return;
        }

        const timer = setTimeout(async () => {
            setEmailCheckLoading(true);
            try {
                const result = await authApi.checkEmailAvailability(formData.email);
                setEmailAvailable(result);
                if (!result.available && !result.needs_verification) {
                    setErrors((prev) => ({ ...prev, email: "Email already registered" }));
                } else {
                    setErrors((prev) => {
                        const { email, ...rest } = prev;
                        return rest;
                    });
                }
            } catch (error) {
                console.error("Email check failed:", error);
            } finally {
                setEmailCheckLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.email, step]);

    // Countdown timer for resend cooldown
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => {
                setResendCooldown(resendCooldown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    // Restore state from sessionStorage on mount
    useEffect(() => {
        const savedStep = sessionStorage.getItem("signup_step");
        const savedEmail = sessionStorage.getItem("signup_email");
        const savedName = sessionStorage.getItem("signup_name");

        if (savedStep === "verify" && savedEmail) {
            setStep("verify");
            setFormData((prev) => ({
                ...prev,
                email: savedEmail,
                name: savedName || "",
            }));
        }
    }, []);

    const validateField = (name: string, value: string): string | null => {
        switch (name) {
            case "name":
                if (value.length < 2) return "Name must be at least 2 characters";
                return null;

            case "email":
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) return "Invalid email format";
                return null;

            case "password":
                if (value.length < 8) return "Password must be at least 8 characters";
                if (!/[A-Z]/.test(value))
                    return "Password must contain an uppercase letter";
                if (!/[a-z]/.test(value))
                    return "Password must contain a lowercase letter";
                if (!/[0-9]/.test(value)) return "Password must contain a number";
                if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(value))
                    return "Password must contain a special character";
                return null;

            case "confirmPassword":
                if (value !== formData.password) return "Passwords do not match";
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

    const handleSignup = async (e: React.FormEvent) => {
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

        if (emailAvailable && !emailAvailable.available && !emailAvailable.needs_verification) {
            toast.error("Please use a different email address");
            return;
        }

        setIsLoading(true);

        try {
            await authApi.signup({
                name: formData.name,
                email: formData.email,
                password: formData.password,
            });

            toast.success("Registration successful! Please check your email for the verification code.");

            // Save to sessionStorage for refresh resilience
            sessionStorage.setItem("signup_step", "verify");
            sessionStorage.setItem("signup_email", formData.email);
            sessionStorage.setItem("signup_name", formData.name);

            setStep("verify");
            setTimeout(() => {
                document.getElementById("otp-0")?.focus();
            }, 100);
        } catch (error: any) {
            toast.error(error.message || "Signup failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

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

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();

        const otpCode = otp.join("");

        if (otpCode.length !== 6) {
            toast.error("Please enter all 6 digits");
            return;
        }

        setIsVerifying(true);

        try {
            await authApi.verifyEmail(formData.email, otpCode);
            toast.success("Email verified successfully!");

            // Clear session storage on success
            sessionStorage.removeItem("signup_step");
            sessionStorage.removeItem("signup_email");
            sessionStorage.removeItem("signup_name");

            setTimeout(() => {
                router.push("/login");
            }, 1500);
        } catch (error: any) {
            toast.error(error.message || "Invalid OTP code");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;

        setIsResending(true);

        try {
            await authApi.resendOtp(formData.email);
            toast.success("Verification code sent!");
            setResendCooldown(30);
            setOtp(["", "", "", "", "", ""]);
            document.getElementById("otp-0")?.focus();
        } catch (error: any) {
            toast.error(error.message || "Failed to resend code");
        } finally {
            setIsResending(false);
        }
    };

    const handleBackToSignup = () => {
        sessionStorage.removeItem("signup_step");
        sessionStorage.removeItem("signup_email");
        sessionStorage.removeItem("signup_name");
        setStep("signup");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    {step === "signup" ? (
                        <>
                            {/* Signup Form */}
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                    Create Account
                                </h1>
                                <p className="text-gray-600">Join WhatsApp AI Assistant today</p>
                            </div>

                            <form onSubmit={handleSignup} className="space-y-5">
                                {/* Name Field */}
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 rounded-lg border ${errors.name ? "border-red-500" : "border-gray-300"
                                            } focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition`}
                                        placeholder="John Doe"
                                        required
                                    />
                                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                                </div>

                                {/* Email Field */}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address
                                    </label>
                                    <div className="relative">
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
                                        />
                                        {emailCheckLoading && (
                                            <div className="absolute right-3 top-3">
                                                <div className="animate-spin h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                                            </div>
                                        )}
                                        {emailAvailable?.available === true && !emailCheckLoading && (
                                            <div className="absolute right-3 top-3 text-green-500">✓</div>
                                        )}
                                    </div>
                                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                                    {emailAvailable?.needs_verification && (
                                        <p className="text-purple-600 text-sm mt-1">
                                            This email is already registered but not verified.{" "}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setStep("verify");
                                                    sessionStorage.setItem("signup_step", "verify");
                                                    sessionStorage.setItem("signup_email", formData.email);
                                                    sessionStorage.setItem("signup_name", formData.name);
                                                }}
                                                className="font-bold underline hover:text-purple-800"
                                            >
                                                Verify Now
                                            </button>
                                        </p>
                                    )}
                                </div>

                                {/* Password Field */}
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 rounded-lg border ${errors.password ? "border-red-500" : "border-gray-300"
                                            } focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition`}
                                        placeholder="••••••••"
                                        required
                                    />
                                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                                    {formData.password && <PasswordStrength password={formData.password} />}
                                </div>

                                {/* Confirm Password Field */}
                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 rounded-lg border ${errors.confirmPassword ? "border-red-500" : "border-gray-300"
                                            } focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition`}
                                        placeholder="••••••••"
                                        required
                                    />
                                    {errors.confirmPassword && (
                                        <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                                    )}
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
                                            Creating Account...
                                        </>
                                    ) : (
                                        "Create Account"
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-gray-600">
                                    Already have an account?{" "}
                                    <a href="/login" className="text-purple-600 font-semibold hover:text-purple-700 transition">
                                        Sign In
                                    </a>
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* OTP Verification */}
                            <div className="text-center mb-8">
                                <div className="flex justify-center mb-4">
                                    <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center">
                                        <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                </div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
                                <p className="text-gray-600">We've sent a 6-digit code to</p>
                                <p className="text-purple-600 font-semibold">{formData.email}</p>
                            </div>

                            <form onSubmit={handleVerify} className="space-y-6">
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
                                                className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                                                required
                                            />
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isVerifying || otp.join("").length !== 6}
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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

                            <div className="mt-6 text-center">
                                <p className="text-gray-600 text-sm">
                                    Didn't receive the code?{" "}
                                    <button
                                        onClick={handleResend}
                                        disabled={resendCooldown > 0 || isResending}
                                        className="text-purple-600 font-semibold hover:text-purple-700 transition disabled:text-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {isResending ? "Sending..." : resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend"}
                                    </button>
                                </p>
                                <button
                                    onClick={handleBackToSignup}
                                    className="text-gray-600 text-sm mt-4 hover:text-gray-800 transition"
                                >
                                    ← Back to signup
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

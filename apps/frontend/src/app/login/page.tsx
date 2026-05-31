"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingInput } from "@/components/ui/floating-input";
import { Eye, EyeOff } from "lucide-react";
import { getErrorMessage } from "@/lib/utils";
import {
    consumeAuthRedirect,
    getDefaultPostLoginPath,
    migrateLegacyAuthQueryParams,
    setForgotPasswordEmail,
    setVerifyEmail,
} from "@/lib/auth-storage";

export default function LoginPage() {
    const router = useRouter();
    const { login, isAuthenticated, user } = useAuth();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        migrateLegacyAuthQueryParams();
    }, []);

    useEffect(() => {
        if (isAuthenticated && user) {
            router.push(getDefaultPostLoginPath(user.role));
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

        const error = validateField(name, value);
        setErrors((prev) => {
            const rest = { ...prev };
            delete rest.general;
            delete rest[name];
            if (error) {
                return { ...rest, [name]: error };
            }
            return rest;
        });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

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
            const response = await authApi.login(formData.email, formData.password);

            login(
                response.user,
                response.tokens.access_token,
                response.tokens.refresh_token,
                rememberMe
            );

            toast.success(`Welcome back, ${response.user.name}!`);

            const redirectTo =
                consumeAuthRedirect() || getDefaultPostLoginPath(response.user.role);
            router.push(redirectTo);
        } catch (error: unknown) {
            const message = getErrorMessage(error, "Login failed");
            if (message.includes("verify your email")) {
                setErrors({ general: message });
                toast.error(
                    <div>
                        <p>{message}</p>
                        <button
                            onClick={() => {
                                setVerifyEmail(formData.email);
                                router.push("/verify-email");
                            }}
                            className="mt-2 text-sm underline font-semibold"
                        >
                            Resend verification code
                        </button>
                    </div>
                );
            } else if (message.includes("deactivated")) {
                setErrors({ general: "Your account has been deactivated. Please contact support." });
                toast.error("Account deactivated");
            } else if (message.includes("Invalid email or password")) {
                setErrors({ general: "Invalid email or password" });
                toast.error("Invalid credentials");
            } else {
                setErrors({ general: message || "Login failed. Please try again." });
                toast.error(message || "Login failed");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPasswordClick = () => {
        if (formData.email) {
            setForgotPasswordEmail(formData.email);
        }
        router.push("/forgot-password");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-gray-600">Sign in to your account</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        {errors.general && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {errors.general}
                            </div>
                        )}

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
                            <button
                                type="button"
                                onClick={handleForgotPasswordClick}
                                className="text-sm text-primary hover:text-primary/90 font-semibold transition"
                            >
                                Forgot Password?
                            </button>
                        </div>

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
                </div>
            </div>
        </div>
    );
}

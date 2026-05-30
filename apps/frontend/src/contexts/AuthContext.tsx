"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { tokenStorage, User } from "@/lib/api";

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    mustChangePassword: boolean;
    login: (user: User, accessToken: string, refreshToken: string, rememberMe?: boolean) => void;
    logout: () => void;
    isAdmin: () => boolean;
    hasRole: (role: string) => boolean;
    hasAnyRole: (roles: string[]) => boolean;
    clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Check for existing token on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = tokenStorage.getAccessToken();

            if (token) {
                // TODO: Optionally validate token with backend
                // For now, we'll just check if it exists
                // In a production app, you'd want to verify the token is still valid
                try {
                    // Decode JWT to get user info (basic implementation)
                    const payload = JSON.parse(atob(token.split('.')[1]));

                    // Check if token is expired
                    if (payload.exp && payload.exp * 1000 < Date.now()) {
                        // Token expired, try to refresh
                        const refreshToken = tokenStorage.getRefreshToken();
                        if (refreshToken) {
                            // TODO: Implement token refresh
                            // For now, just clear tokens
                            tokenStorage.clearTokens();
                            setUser(null);
                        }
                    } else {
                        // Token is valid, set minimal user info from token
                        setUser({
                            id: parseInt(payload.sub),
                            email: payload.email,
                            name: payload.name || "User",
                            role: payload.role || "USER",
                            isActive: true,
                            emailVerified: true,
                            mustChangePassword: payload.must_change_password || false,
                        });
                    }
                } catch (error) {
                    console.error("Failed to parse token:", error);
                    tokenStorage.clearTokens();
                }
            }

            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = (user: User, accessToken: string, refreshToken: string, rememberMe: boolean = false) => {
        setUser(user);
        tokenStorage.setTokens(accessToken, refreshToken, rememberMe);
    };

    const logout = () => {
        setUser(null);
        tokenStorage.clearTokens();
        window.location.href = "/login";
    };

    const isAdmin = () => {
        return user?.role === "ADMIN";
    };

    const hasRole = (role: string) => {
        return user?.role === role;
    };

    const hasAnyRole = (roles: string[]) => {
        return user ? roles.includes(user.role) : false;
    };

    const clearMustChangePassword = () => {
        if (user) {
            setUser({ ...user, mustChangePassword: false });
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                mustChangePassword: user?.mustChangePassword || false,
                login,
                logout,
                isAdmin,
                hasRole,
                hasAnyRole,
                clearMustChangePassword,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

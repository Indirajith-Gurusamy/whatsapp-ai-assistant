"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: string;
}

const publicRoutes = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password", "/admin/login", "/admin/signup"];

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, hasRole } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Don't redirect if still loading
        if (isLoading) return;

        // Check if current route is public
        const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));

        // If not authenticated and trying to access protected route, redirect to login
        if (!isAuthenticated && !isPublicRoute) {
            router.push(`/login?redirect=${encodeURIComponent(pathname || "/conversations")}`);
        }

        // If authenticated and trying to access login/signup, redirect to conversations
        if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
            router.push("/conversations");
        }

        // Check role requirement
        if (isAuthenticated && requiredRole && !hasRole(requiredRole)) {
            // User is authenticated but doesn't have required role
            router.push("/");
        }
    }, [isAuthenticated, isLoading, pathname, router, requiredRole, hasRole]);

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700">
                <div className="text-white text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    // Show access denied if role requirement not met
    if (isAuthenticated && requiredRole && !hasRole(requiredRole)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700">
                <div className="text-white text-center">
                    <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
                    <p className="text-lg">You don't have permission to access this page.</p>
                    <button
                        onClick={() => router.push("/")}
                        className="mt-6 px-6 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}


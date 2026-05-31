"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { setAuthRedirect } from "@/lib/auth-storage";

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
            setAuthRedirect(pathname || "/conversations");
            router.push("/login");
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

    // Don't block rendering while checking authentication
    // The layout (sidebar/navbar) should render immediately
    // Individual pages handle their own loading states with skeletons
    if (isLoading) {
        // For public routes, just render children (auth pages handle their own state)
        const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));
        if (isPublicRoute) {
            return <>{children}</>;
        }
        // For protected routes during initial auth check, render children
        // Pages will show their skeleton states
        return <>{children}</>;
    }

    // Show access denied if role requirement not met
    if (isAuthenticated && requiredRole && !hasRole(requiredRole)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                <div className="text-gray-900 dark:text-white text-center">
                    <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
                    <p className="text-lg">You don&apos;t have permission to access this page.</p>
                    <button
                        onClick={() => router.push("/")}
                        className="mt-6 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}


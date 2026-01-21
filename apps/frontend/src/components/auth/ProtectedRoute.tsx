"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const publicRoutes = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"];

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuth();
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
    }, [isAuthenticated, isLoading, pathname, router]);

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

    return <>{children}</>;
}

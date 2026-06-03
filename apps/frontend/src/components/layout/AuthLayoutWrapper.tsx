"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DashboardLayout } from "./DashboardLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ForcePasswordChangeModal } from "@/components/auth/ForcePasswordChangeModal";
import { isPublicAuthRoute } from "@/lib/auth-storage";

interface AuthLayoutWrapperProps {
    children: React.ReactNode;
}

function AuthLayoutContent({ children }: AuthLayoutWrapperProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { mustChangePassword, isAuthenticated, isLoading } = useAuth();

    const isAuthPage = isPublicAuthRoute(pathname);

    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated && !isAuthPage) {
            router.replace("/login");
        }
    }, [isAuthenticated, isLoading, isAuthPage, router]);

    if (!isLoading && !isAuthenticated && !isAuthPage) {
        return null;
    }

    return (
        <>
            <ProtectedRoute>
                {isAuthPage ? (
                    <>{children}</>
                ) : (
                    <DashboardLayout>{children}</DashboardLayout>
                )}
            </ProtectedRoute>
            {isAuthenticated && mustChangePassword && !isAuthPage && (
                <ForcePasswordChangeModal open={true} />
            )}
        </>
    );
}

export function AuthLayoutWrapper({ children }: AuthLayoutWrapperProps) {
    return (
        <AuthProvider>
            <AuthLayoutContent>{children}</AuthLayoutContent>
        </AuthProvider>
    );
}

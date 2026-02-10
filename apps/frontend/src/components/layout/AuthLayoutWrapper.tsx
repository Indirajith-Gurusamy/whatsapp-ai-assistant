"use client";

import { usePathname } from "next/navigation";
import { DashboardLayout } from "./DashboardLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ForcePasswordChangeModal } from "@/components/auth/ForcePasswordChangeModal";

interface AuthLayoutWrapperProps {
    children: React.ReactNode;
}

function AuthLayoutContent({ children }: AuthLayoutWrapperProps) {
    const pathname = usePathname();
    const { mustChangePassword, isAuthenticated } = useAuth();

    // Pages that should not use the dashboard layout
    const authPages = ["/signup", "/login", "/verify-email", "/forgot-password", "/reset-password", "/admin/signup", "/admin/login"];
    const isAuthPage = authPages.some(page => pathname.startsWith(page));

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

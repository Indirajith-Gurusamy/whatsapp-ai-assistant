"use client";

import { usePathname } from "next/navigation";
import { DashboardLayout } from "./DashboardLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

interface AuthLayoutWrapperProps {
    children: React.ReactNode;
}

export function AuthLayoutWrapper({ children }: AuthLayoutWrapperProps) {
    const pathname = usePathname();

    // Pages that should not use the dashboard layout
    const authPages = ["/signup", "/login", "/verify-email", "/forgot-password", "/reset-password"];
    const isAuthPage = authPages.some(page => pathname.startsWith(page));

    return (
        <AuthProvider>
            <ProtectedRoute>
                {isAuthPage ? (
                    <>{children}</>
                ) : (
                    <DashboardLayout>{children}</DashboardLayout>
                )}
            </ProtectedRoute>
        </AuthProvider>
    );
}

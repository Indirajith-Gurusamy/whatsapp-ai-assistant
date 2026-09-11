"use client";

import { ProtectedRoute } from "./ProtectedRoute";

interface AdminRouteProps {
    children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
    return (
        <ProtectedRoute requiredRole={['ADMIN', 'HR']}>
            {children}
        </ProtectedRoute>
    );
}

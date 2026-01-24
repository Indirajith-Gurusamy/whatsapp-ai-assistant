"use client";

import { useAuth } from "@/contexts/AuthContext";

interface RequireRoleProps {
    role: string | string[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function RequireRole({ role, children, fallback = null }: RequireRoleProps) {
    const { hasRole, hasAnyRole } = useAuth();

    const hasRequiredRole = Array.isArray(role)
        ? hasAnyRole(role)
        : hasRole(role);

    if (!hasRequiredRole) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

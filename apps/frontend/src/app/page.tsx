'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultPostLoginPath } from '@/lib/auth-storage';

export default function Home() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;
        router.replace(getDefaultPostLoginPath(user?.role ?? 'USER'));
    }, [isLoading, user?.role, router]);

    return null;
}
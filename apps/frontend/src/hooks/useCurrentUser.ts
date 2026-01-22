'use client';

import { useState, useEffect } from 'react';
import { profileApi } from '@/lib/api';
import type { UserProfile } from '@/types';

export function useCurrentUser() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function loadUser() {
            try {
                setIsLoading(true);
                const userData = await profileApi.getUserProfile();
                setUser(userData);
                setError(null);
            } catch (err) {
                setError(err as Error);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        }

        loadUser();
    }, []);

    const refresh = async () => {
        try {
            const userData = await profileApi.getUserProfile();
            setUser(userData);
            setError(null);
        } catch (err) {
            setError(err as Error);
        }
    };

    return { user, isLoading, error, refresh };
}

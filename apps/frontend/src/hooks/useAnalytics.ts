'use client';

import useSWR from 'swr';
import { fetchAnalytics } from '@/lib/api';
import type { Analytics } from '@/types';

export function useAnalytics() {
    const { data, error, isLoading, mutate } = useSWR<Analytics>(
        'analytics',
        fetchAnalytics,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        analytics: data,
        error,
        isLoading,
        refresh: mutate,
    };
}

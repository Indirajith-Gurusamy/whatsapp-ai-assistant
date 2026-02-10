'use client';

import useSWR from 'swr';
import { fetchMessages } from '@/lib/api';
import type { Message } from '@/types';

export function useMessages(limit = 500) {
    const { data, error, isLoading, mutate } = useSWR<Message[]>(
        ['messages', limit],
        () => fetchMessages(limit),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            revalidateIfStale: false,
            refreshInterval: 0,
            shouldRetryOnError: false,
            dedupingInterval: 5000,
        }
    );

    return {
        messages: data ?? [],
        error,
        isLoading,
        refresh: mutate,
    };
}

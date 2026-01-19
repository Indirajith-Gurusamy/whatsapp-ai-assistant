'use client';

import useSWR from 'swr';
import { fetchMessages } from '@/lib/api';
import type { Message } from '@/types';

export function useMessages(limit = 500) {
    const { data, error, isLoading, mutate } = useSWR<Message[]>(
        ['messages', limit],
        () => fetchMessages(limit),
        {
            revalidateOnFocus: true,
            refreshInterval: 1000, // Auto-refresh every 1 second
            dedupingInterval: 500,
        }
    );

    return {
        messages: data ?? [],
        error,
        isLoading,
        refresh: mutate,
    };
}

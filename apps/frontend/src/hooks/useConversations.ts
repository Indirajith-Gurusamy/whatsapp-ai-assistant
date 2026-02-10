'use client';

import useSWR from 'swr';
import { fetchConversations } from '@/lib/api';
import type { Conversation } from '@/types';

export function useConversations(limit = 500) {
    const { data, error, isLoading, mutate } = useSWR<Conversation[]>(
        ['conversations', limit],
        () => fetchConversations(limit),
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
        conversations: data ?? [],
        error,
        isLoading,
        refresh: mutate,
    };
}

'use client';

import useSWR from 'swr';
import { fetchConversations } from '@/lib/api';
import type { Conversation } from '@/types';

export function useConversations(limit = 500) {
    const { data, error, isLoading, mutate } = useSWR<Conversation[]>(
        ['conversations', limit],
        () => fetchConversations(limit),
        {
            revalidateOnFocus: true,
            refreshInterval: 1000, // Auto-refresh every 1 second
            dedupingInterval: 500,
        }
    );

    return {
        conversations: data ?? [],
        error,
        isLoading,
        refresh: mutate,
    };
}

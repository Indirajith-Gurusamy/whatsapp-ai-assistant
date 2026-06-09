'use client';

import useSWR from 'swr';
import { fetchConversations } from '@/lib/api';
import type { Conversation } from '@/types';
import { channelQueryParam, type ChannelFilter } from '@/lib/channel-filter';

export function useConversations(limit = 500, channelFilter: ChannelFilter = 'all') {
    const channel = channelQueryParam(channelFilter);
    const { data, error, isLoading, mutate } = useSWR<Conversation[]>(
        ['conversations', limit, channelFilter],
        () => fetchConversations(limit, channel),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            revalidateIfStale: false,
            refreshInterval: 0,
            shouldRetryOnError: false,
            dedupingInterval: 5000,
        }
    );

    const conversations = [...(data ?? [])].sort(
        (a, b) => (b.latest_message_id ?? b.message_id) - (a.latest_message_id ?? a.message_id),
    );

    return {
        conversations,
        error,
        isLoading,
        refresh: mutate,
    };
}

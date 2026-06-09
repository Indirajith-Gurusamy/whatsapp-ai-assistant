'use client';

import useSWR from 'swr';
import { fetchMessages } from '@/lib/api';
import type { Message } from '@/types';
import { channelQueryParam, type ChannelFilter } from '@/lib/channel-filter';

export function useMessages(limit = 500, channelFilter: ChannelFilter = 'all') {
    const channel = channelQueryParam(channelFilter);
    const { data, error, isLoading, mutate } = useSWR<Message[]>(
        ['messages', limit, channelFilter],
        () => fetchMessages(limit, channel),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            revalidateIfStale: false,
            refreshInterval: 0,
            shouldRetryOnError: false,
            dedupingInterval: 5000,
        }
    );

    const messages = [...(data ?? [])].sort((a, b) => b.id - a.id);

    return {
        messages,
        error,
        isLoading,
        refresh: mutate,
    };
}

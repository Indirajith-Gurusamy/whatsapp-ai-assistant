'use client';

import useSWR from 'swr';
import { fetchCustomers } from '@/lib/api';
import type { Customer } from '@/types';
import { channelQueryParam, type ChannelFilter } from '@/lib/channel-filter';

export function useCustomers(limit = 500, channelFilter: ChannelFilter = 'all') {
    const channel = channelQueryParam(channelFilter);
    const { data, error, isLoading, mutate } = useSWR<Customer[]>(
        ['customers', limit, channelFilter],
        () => fetchCustomers(limit, channel),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    const customers = [...(data ?? [])].sort(
        (a, b) => (b.latest_message_id ?? 0) - (a.latest_message_id ?? 0),
    );

    return {
        customers,
        error,
        isLoading,
        refresh: mutate,
    };
}

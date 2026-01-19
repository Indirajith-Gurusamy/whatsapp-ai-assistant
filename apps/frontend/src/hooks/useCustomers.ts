'use client';

import useSWR from 'swr';
import { fetchCustomers } from '@/lib/api';
import type { Customer } from '@/types';

export function useCustomers(limit = 500) {
    const { data, error, isLoading, mutate } = useSWR<Customer[]>(
        ['customers', limit],
        () => fetchCustomers(limit),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        customers: data ?? [],
        error,
        isLoading,
        refresh: mutate,
    };
}

'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { adminApi, type UserListItem } from '@/lib/api';
import { buildEmailToNameMap } from '@/lib/assignee';

export function useTeamUsers(enabled = true) {
  const { data, isLoading } = useSWR<UserListItem[]>(
    enabled ? ['team-users'] : null,
    () => adminApi.getAllUsers(0, 100).then((res) => res.users),
  );

  const users = data ?? [];
  const emailToName = useMemo(() => buildEmailToNameMap(users), [users]);

  return { users, emailToName, isLoading: enabled && isLoading };
}

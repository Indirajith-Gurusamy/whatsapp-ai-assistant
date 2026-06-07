import type { UserListItem } from '@/lib/api';

export function buildEmailToNameMap(users: UserListItem[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const user of users) {
    if (user.email) {
      map.set(user.email.toLowerCase(), user.name || user.email);
    }
  }
  return map;
}

export function formatAssigneeLabel(
  email: string | null | undefined,
  emailToName?: Map<string, string>,
  currentUserEmail?: string | null,
): string {
  if (!email) return 'Unassigned';
  const key = email.toLowerCase();
  if (currentUserEmail && key === currentUserEmail.toLowerCase()) {
    return emailToName?.get(key) || 'You';
  }
  return emailToName?.get(key) || email.split('@')[0] || email;
}

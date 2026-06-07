'use client';

import { User } from 'lucide-react';
import { formatAssigneeLabel } from '@/lib/assignee';
import { cn } from '@/lib/utils';

interface AssigneeCellProps {
  email?: string | null;
  emailToName?: Map<string, string>;
  currentUserEmail?: string | null;
  className?: string;
}

export function AssigneeCell({
  email,
  emailToName,
  currentUserEmail,
  className,
}: AssigneeCellProps) {
  const label = formatAssigneeLabel(email, emailToName, currentUserEmail);
  const unassigned = !email;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-sm max-w-[140px] truncate',
        unassigned ? 'text-muted-foreground/60' : 'text-foreground',
        className,
      )}
      title={email || 'Unassigned'}
    >
      {!unassigned && <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      <span className="truncate">{label}</span>
    </span>
  );
}

import type { LeadStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { themeClasses } from '@/lib/theme';

const statusStyles: Record<LeadStatus, string> = {
    'new lead': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'assigned': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    'application sent': `${themeClasses.badgePrimary} ${themeClasses.badgePrimaryDark}`,
    'application in': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'nurture': `${themeClasses.badgePrimary} ${themeClasses.badgePrimaryDark}`,
    'follow up': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'on hold': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    'lost': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'duplicate': 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400',
    'closed': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const statusLabels: Record<LeadStatus, string> = {
    'new lead': 'New Lead',
    'assigned': 'Assigned',
    'application sent': 'App Sent',
    'application in': 'App In',
    'nurture': 'Nurture',
    'follow up': 'Follow Up',
    'on hold': 'On Hold',
    'lost': 'Lost',
    'duplicate': 'Duplicate',
    'closed': 'Closed',
};

const fallbackStyle =
    'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400';

interface StatusBadgeProps {
    status: LeadStatus | string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const label = statusLabels[status as LeadStatus] ?? status;
    const style = statusStyles[status as LeadStatus] ?? fallbackStyle;

    return (
        <Badge
            variant="secondary"
            title={label}
            className={cn(
                "font-medium text-xs max-w-full truncate inline-block",
                style,
                className
            )}
        >
            {label}
        </Badge>
    );
}

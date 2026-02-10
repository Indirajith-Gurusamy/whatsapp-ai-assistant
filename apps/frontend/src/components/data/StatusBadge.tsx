import type { LeadStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { themeClasses } from '@/lib/theme';

const statusStyles: Record<LeadStatus, string> = {
    'new lead': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'application sent': `${themeClasses.badgePrimary} ${themeClasses.badgePrimaryDark}`,
    'application in': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'nurture': `${themeClasses.badgePrimary} ${themeClasses.badgePrimaryDark}`,
    'follow up': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'on hold': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    'lost': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'duplicate': 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400',
    'closed': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

interface StatusBadgeProps {
    status: LeadStatus;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    return (
        <Badge
            variant="secondary"
            className={cn(
                "font-medium text-xs capitalize whitespace-nowrap",
                statusStyles[status],
                className
            )}
        >
            {status}
        </Badge>
    );
}

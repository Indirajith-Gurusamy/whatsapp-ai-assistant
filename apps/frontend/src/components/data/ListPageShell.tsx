'use client';

import { cn } from '@/lib/utils';
import { listPageCard, listPageFill } from '@/components/settings/settings-layout';

interface ListPageShellProps {
    children: React.ReactNode;
    className?: string;
}

/** Full-bleed list page wrapper (Customers-style). */
export function ListPageShell({ children, className }: ListPageShellProps) {
    return (
        <div className={listPageFill}>
            <div className={cn(listPageCard, 'flex flex-1 flex-col min-h-0', className)}>
                {children}
            </div>
        </div>
    );
}

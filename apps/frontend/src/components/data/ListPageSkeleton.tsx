'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { listPageCard, listPageFill } from '@/components/settings/settings-layout';

interface ListPageSkeletonProps {
    columns: number;
    rows?: number;
}

/** Loading state for full-bleed list pages. */
export function ListPageSkeleton({ columns, rows = 8 }: ListPageSkeletonProps) {
    return (
        <div className={listPageFill}>
            <div className={listPageCard}>
                <div className="shrink-0 px-4 md:px-5 pt-4 pb-1">
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 px-4 py-3.5 md:px-5 md:py-4">
                        <Skeleton className="h-10 min-w-0 flex-1 max-w-xl rounded-full" />
                        <div className="flex shrink-0 gap-2">
                            <Skeleton className="h-10 w-24 rounded-md" />
                            <Skeleton className="h-10 w-24 rounded-md" />
                            <Skeleton className="h-10 w-24 rounded-md" />
                        </div>
                    </div>
                </div>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex gap-4 px-4 py-3.5 border-b bg-gray-50/80">
                        <Skeleton className="h-4 w-4 shrink-0" />
                        {Array.from({ length: columns }).map((_, i) => (
                            <Skeleton key={i} className="h-3 w-16 flex-1" />
                        ))}
                    </div>
                    {Array.from({ length: rows }).map((_, i) => (
                        <div key={i} className="flex gap-4 px-4 py-4 border-b border-gray-100">
                            <Skeleton className="h-4 w-4 shrink-0" />
                            {Array.from({ length: columns }).map((_, j) => (
                                <Skeleton key={j} className="h-4 flex-1 max-w-[120px]" />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

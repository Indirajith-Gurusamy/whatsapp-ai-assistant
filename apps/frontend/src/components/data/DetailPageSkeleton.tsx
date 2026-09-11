'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DetailPageSkeletonProps {
    variant?: 'candidate' | 'job' | 'client';
    className?: string;
}

/** Loading state for Recruitment detail pages, matching the list-page skeleton style. */
export function DetailPageSkeleton({ variant = 'candidate', className }: DetailPageSkeletonProps) {
    return (
        <div className={cn('flex h-full w-full flex-col gap-4 overflow-y-auto p-4 sm:p-6', className)}>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-44" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <Skeleton className="h-9 w-24 rounded-md" />
            </div>

            {/* Stat cards */}
            {variant === 'job' && (
                <div className="grid gap-3 sm:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-lg border bg-card p-4">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="mt-2 h-6 w-20" />
                        </div>
                    ))}
                </div>
            )}

            {/* Main info block */}
            <div className="grid gap-4 lg:grid-cols-3">
                <div className={cn('rounded-lg border bg-card p-4', variant !== 'job' && 'lg:col-span-2')}>
                    <Skeleton className="mb-4 h-4 w-20" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton
                                key={i}
                                className={cn('h-4 w-full', i % 3 === 2 ? 'max-w-[140px]' : 'max-w-[220px]')}
                            />
                        ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-5 w-16 rounded-full" />
                        ))}
                    </div>
                </div>
                {variant !== 'job' && (
                    <div className="rounded-lg border bg-card p-4">
                        <Skeleton className="mb-4 h-4 w-24" />
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-3 w-full" />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* List block */}
            <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <div className="space-y-3 rounded-lg border bg-card p-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                    ))}
                </div>
            </div>
        </div>
    );
}
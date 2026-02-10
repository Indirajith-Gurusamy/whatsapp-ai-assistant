'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface PageSkeletonProps {
    title?: boolean;
    cards?: number;
    table?: boolean;
}

export function PageSkeleton({ title = true, cards = 0, table = false }: PageSkeletonProps) {
    return (
        <div className="p-4 md:p-6 space-y-6">
            {title && (
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>
            )}
            
            {cards > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: cards }).map((_, i) => (
                        <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                    ))}
                </div>
            )}
            
            {table && (
                <div className="rounded-lg border bg-card p-4 space-y-4">
                    <div className="flex justify-between">
                        <Skeleton className="h-9 w-80" />
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-20" />
                            <Skeleton className="h-9 w-24" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-4 flex-1" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

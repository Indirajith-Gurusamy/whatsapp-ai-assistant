import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
    showActions?: boolean;
}

export function TableSkeleton({ rows = 7, columns = 5, showActions = true }: TableSkeletonProps) {
    return (
        <div className="p-4 md:p-6 lg:p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Table Container */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Table Header */}
                <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <div className="grid gap-4 p-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)${showActions ? ' auto' : ''}` }}>
                        {Array.from({ length: columns }).map((_, i) => (
                            <Skeleton key={i} className="h-5 w-24" />
                        ))}
                        {showActions && <Skeleton className="h-5 w-20" />}
                    </div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                        <div
                            key={rowIndex}
                            className="grid gap-4 p-4"
                            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)${showActions ? ' auto' : ''}` }}
                        >
                            {Array.from({ length: columns }).map((_, colIndex) => (
                                <Skeleton key={colIndex} className="h-5 w-full" />
                            ))}
                            {showActions && (
                                <div className="flex gap-2">
                                    <Skeleton className="h-8 w-8 rounded" />
                                    <Skeleton className="h-8 w-8 rounded" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

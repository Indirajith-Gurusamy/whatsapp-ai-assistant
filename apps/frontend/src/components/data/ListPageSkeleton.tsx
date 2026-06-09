'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { listPageCard, listPageFill } from '@/components/settings/settings-layout';
import { cn } from '@/lib/utils';

export type ListPageSkeletonVariant =
    | 'customers'
    | 'messages'
    | 'leads'
    | 'users'
    | 'generic';

interface ListPageSkeletonProps {
    /** Page-specific layout. Defaults to generic when `columns` is provided. */
    variant?: ListPageSkeletonVariant;
    /** Used only for the generic variant. */
    columns?: number;
    rows?: number;
    showChannelFilter?: boolean;
    showAddButton?: boolean;
}

const stickyHeadClass =
    'sticky top-0 z-10 bg-gray-50 shadow-[inset_0_-1px_0_0] shadow-gray-200 dark:bg-gray-900 dark:shadow-gray-800';

const nameWidths = ['w-28', 'w-32', 'w-24', 'w-36', 'w-28', 'w-32', 'w-28', 'w-32'];
const messageWidths = ['w-[85%]', 'w-[70%]', 'w-[90%]', 'w-[60%]', 'w-[75%]', 'w-[80%]', 'w-[65%]', 'w-[72%]'];

function SkeletonCheckbox() {
    return <Skeleton className="h-4 w-4 rounded-sm" />;
}

function SkeletonBadge({ className }: { className?: string }) {
    return <Skeleton className={cn('h-5 rounded-full', className)} />;
}

function SkeletonAction() {
    return <Skeleton className="ml-auto h-8 w-8 rounded-md" />;
}

function SkeletonAssignee({ width = 'w-24' }: { width?: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-full" />
            <Skeleton className={cn('h-4', width)} />
        </div>
    );
}

function SkeletonDateTime({ align = 'left' }: { align?: 'left' | 'right' }) {
    return (
        <div className={cn('space-y-1', align === 'right' && 'ml-auto w-fit')}>
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3 w-14" />
        </div>
    );
}

function SkeletonUserStack({ nameWidth, emailWidth }: { nameWidth: string; emailWidth: string }) {
    return (
        <div className="space-y-1.5">
            <Skeleton className={cn('h-4', nameWidth)} />
            <Skeleton className={cn('h-3.5', emailWidth)} />
        </div>
    );
}

function ToolbarSkeleton({
    showAddButton,
    showChannelFilter,
}: {
    showAddButton?: boolean;
    showChannelFilter?: boolean;
}) {
    return (
        <div className="shrink-0 px-3 pt-3 pb-1 md:px-5 md:pt-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 sm:gap-3 md:px-5 md:py-3.5">
                <div className="flex min-w-0 flex-1 basis-[min(100%,12rem)] items-center gap-2">
                    <Skeleton className="h-10 min-w-0 flex-1 rounded-full" />
                    {showChannelFilter && (
                        <>
                            <Skeleton className="hidden h-4 w-14 sm:block" />
                            <Skeleton className="h-9 w-[7.5rem] shrink-0 rounded-md sm:w-[8.75rem] md:w-[10rem]" />
                        </>
                    )}
                </div>
                <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
                <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
                {showAddButton && <Skeleton className="h-10 w-10 shrink-0 rounded-md sm:w-24" />}
            </div>
        </div>
    );
}

function FooterSkeleton() {
    return (
        <div className="flex shrink-0 flex-col items-center justify-between gap-4 border-t border-gray-200 px-4 py-3 dark:border-gray-800 sm:flex-row md:px-5">
            <Skeleton className="h-4 w-28" />
            <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-[70px] rounded-md" />
                <div className="ml-4 flex items-center gap-1">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
            </div>
        </div>
    );
}

function CustomersSkeletonRows({ rows }: { rows: number }) {
    return (
        <>
            <TableHeader>
                <TableRow className="border-b-0 bg-transparent hover:bg-transparent">
                    <TableHead className={cn('w-12 px-4', stickyHeadClass)}>
                        <SkeletonCheckbox />
                    </TableHead>
                    <TableHead className={cn('px-4 py-3.5', stickyHeadClass)}>
                        <Skeleton className="h-3 w-10" />
                    </TableHead>
                    <TableHead className={cn('px-4 py-3.5', stickyHeadClass)}>
                        <Skeleton className="h-3 w-12" />
                    </TableHead>
                    <TableHead className={cn('px-4 py-3.5', stickyHeadClass)}>
                        <Skeleton className="h-3 w-16" />
                    </TableHead>
                    <TableHead className={cn('px-4 py-3.5', stickyHeadClass)}>
                        <Skeleton className="h-3 w-12" />
                    </TableHead>
                    <TableHead className={cn('hidden px-4 py-3.5 md:table-cell', stickyHeadClass)}>
                        <Skeleton className="h-3 w-20" />
                    </TableHead>
                    <TableHead className={cn('px-4 py-3.5', stickyHeadClass)}>
                        <Skeleton className="h-3 w-24" />
                    </TableHead>
                    <TableHead className={cn('w-16 px-4 py-3.5 text-right', stickyHeadClass)}>
                        <Skeleton className="ml-auto h-3 w-14" />
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Array.from({ length: rows }).map((_, i) => (
                    <TableRow
                        key={i}
                        className="border-b border-gray-100 dark:border-gray-800"
                    >
                        <TableCell className="w-12 px-4">
                            <SkeletonCheckbox />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                            <Skeleton className={cn('h-4', nameWidths[i % nameWidths.length])} />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                            <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                            <SkeletonBadge className="w-20" />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                            <SkeletonBadge className="w-[4.5rem]" />
                        </TableCell>
                        <TableCell className="hidden px-4 py-3 md:table-cell">
                            <SkeletonAssignee width={i % 2 === 0 ? 'w-28' : 'w-20'} />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                            <SkeletonDateTime />
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                            <SkeletonAction />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </>
    );
}

function MessagesSkeletonRows({ rows }: { rows: number }) {
    return (
        <>
            <TableHeader>
                <TableRow className="border-b-0 bg-transparent hover:bg-transparent">
                    <TableHead className={cn('w-12 px-4', stickyHeadClass)}>
                        <SkeletonCheckbox />
                    </TableHead>
                    <TableHead className={cn('px-4 py-3.5', stickyHeadClass)}>
                        <Skeleton className="h-3 w-14" />
                    </TableHead>
                    <TableHead className={cn('px-4 py-3.5', stickyHeadClass)}>
                        <Skeleton className="h-3 w-10" />
                    </TableHead>
                    <TableHead className={cn('px-4 py-3.5', stickyHeadClass)}>
                        <Skeleton className="h-3 w-14" />
                    </TableHead>
                    <TableHead className={cn('px-4 py-3.5', stickyHeadClass)}>
                        <Skeleton className="h-3 w-16" />
                    </TableHead>
                    <TableHead className={cn('hidden px-4 py-3.5 text-right md:table-cell', stickyHeadClass)}>
                        <Skeleton className="ml-auto h-3 w-20" />
                    </TableHead>
                    <TableHead className={cn('w-16 px-4 py-3.5 text-right', stickyHeadClass)}>
                        <Skeleton className="ml-auto h-3 w-14" />
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Array.from({ length: rows }).map((_, i) => (
                    <TableRow
                        key={i}
                        className="border-b border-gray-100 dark:border-gray-800"
                    >
                        <TableCell className="w-12 px-4">
                            <SkeletonCheckbox />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                            <Skeleton className="h-3.5 w-14" />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                            <Skeleton className={cn('h-4', nameWidths[i % nameWidths.length])} />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                            <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                            <Skeleton className={cn('h-4 max-w-[300px]', messageWidths[i % messageWidths.length])} />
                        </TableCell>
                        <TableCell className="hidden px-4 py-3 md:table-cell">
                            <SkeletonDateTime align="right" />
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                            <SkeletonAction />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </>
    );
}

function LeadsSkeletonRows({ rows }: { rows: number }) {
    return (
        <>
            <TableHeader>
                <TableRow className="border-b-0 bg-transparent hover:bg-transparent">
                    <TableHead className={cn('w-12 px-4', stickyHeadClass)}>
                        <SkeletonCheckbox />
                    </TableHead>
                    <TableHead className={cn('px-4 py-3.5', stickyHeadClass)}>
                        <Skeleton className="h-3 w-14" />
                    </TableHead>
                    <TableHead className={cn('px-4 py-3.5', stickyHeadClass)}>
                        <Skeleton className="h-3 w-10" />
                    </TableHead>
                    <TableHead className={cn('px-4 py-3.5', stickyHeadClass)}>
                        <Skeleton className="h-3 w-14" />
                    </TableHead>
                    <TableHead className={cn('hidden px-4 py-3.5 md:table-cell', stickyHeadClass)}>
                        <Skeleton className="h-3 w-16" />
                    </TableHead>
                    <TableHead className={cn('hidden px-4 py-3.5 lg:table-cell', stickyHeadClass)}>
                        <Skeleton className="h-3 w-24" />
                    </TableHead>
                    <TableHead className={cn('hidden px-4 py-3.5 lg:table-cell', stickyHeadClass)}>
                        <Skeleton className="h-3 w-16" />
                    </TableHead>
                    <TableHead className={cn('px-4 py-3.5', stickyHeadClass)}>
                        <Skeleton className="h-3 w-12" />
                    </TableHead>
                    <TableHead className={cn('hidden px-4 py-3.5 sm:table-cell', stickyHeadClass)}>
                        <Skeleton className="h-3 w-20" />
                    </TableHead>
                    <TableHead className={cn('w-16 px-4 py-3.5 text-right', stickyHeadClass)}>
                        <Skeleton className="ml-auto h-3 w-14" />
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Array.from({ length: rows }).map((_, i) => (
                    <TableRow
                        key={i}
                        className="border-b border-gray-100 dark:border-gray-800"
                    >
                        <TableCell className="w-12 px-4">
                            <SkeletonCheckbox />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                            <Skeleton className="h-3.5 w-14" />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                            <Skeleton className={cn('h-4', nameWidths[i % nameWidths.length])} />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                            <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell className="hidden px-4 py-3 md:table-cell">
                            <Skeleton className={cn('h-4 max-w-[200px]', messageWidths[i % messageWidths.length])} />
                        </TableCell>
                        <TableCell className="hidden px-4 py-3 lg:table-cell">
                            <Skeleton className="h-3.5 w-24" />
                        </TableCell>
                        <TableCell className="hidden px-4 py-3 lg:table-cell">
                            <Skeleton className="h-3.5 w-10" />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                            <SkeletonBadge className="w-[4.5rem]" />
                        </TableCell>
                        <TableCell className="hidden px-4 py-3 sm:table-cell">
                            <SkeletonAssignee width={i % 3 === 0 ? 'w-16' : 'w-24'} />
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                            <SkeletonAction />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </>
    );
}

function UsersSkeletonRows({ rows }: { rows: number }) {
    const emailWidths = ['w-44', 'w-52', 'w-40', 'w-48', 'w-36', 'w-52', 'w-44', 'w-48'];

    return (
        <>
            <TableHeader>
                <TableRow className="border-b-0 bg-transparent hover:bg-transparent">
                    <TableHead className={cn('w-12 px-4', stickyHeadClass)}>
                        <SkeletonCheckbox />
                    </TableHead>
                    <TableHead className={cn('px-4 py-3.5', stickyHeadClass)}>
                        <Skeleton className="h-3 w-8" />
                    </TableHead>
                    <TableHead className={cn('px-4 py-3.5', stickyHeadClass)}>
                        <Skeleton className="h-3 w-8" />
                    </TableHead>
                    <TableHead className={cn('px-4 py-3.5', stickyHeadClass)}>
                        <Skeleton className="h-3 w-12" />
                    </TableHead>
                    <TableHead className={cn('hidden px-4 py-3.5 md:table-cell', stickyHeadClass)}>
                        <Skeleton className="h-3 w-14" />
                    </TableHead>
                    <TableHead className={cn('hidden px-4 py-3.5 lg:table-cell', stickyHeadClass)}>
                        <Skeleton className="h-3 w-20" />
                    </TableHead>
                    <TableHead className={cn('w-16 px-4 py-3.5 text-right', stickyHeadClass)}>
                        <Skeleton className="ml-auto h-3 w-14" />
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Array.from({ length: rows }).map((_, i) => (
                    <TableRow
                        key={i}
                        className="border-b border-gray-100 dark:border-gray-800"
                    >
                        <TableCell className="w-12 px-4">
                            <SkeletonCheckbox />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                            <SkeletonUserStack
                                nameWidth={nameWidths[i % nameWidths.length]}
                                emailWidth={emailWidths[i % emailWidths.length]}
                            />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                            <SkeletonBadge className="w-14" />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                            <SkeletonBadge className="w-16" />
                        </TableCell>
                        <TableCell className="hidden px-4 py-3 md:table-cell">
                            <SkeletonBadge className="w-10" />
                        </TableCell>
                        <TableCell className="hidden px-4 py-3 lg:table-cell">
                            <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                            <SkeletonAction />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </>
    );
}

function GenericSkeletonRows({ columns, rows }: { columns: number; rows: number }) {
    return (
        <>
            <TableHeader>
                <TableRow className="border-b-0 bg-transparent hover:bg-transparent">
                    <TableHead className={cn('w-12 px-4', stickyHeadClass)}>
                        <SkeletonCheckbox />
                    </TableHead>
                    {Array.from({ length: columns }).map((_, i) => (
                        <TableHead key={i} className={cn('px-4 py-3.5', stickyHeadClass)}>
                            <Skeleton className="h-3 w-16" />
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <TableRow
                        key={rowIndex}
                        className="border-b border-gray-100 dark:border-gray-800"
                    >
                        <TableCell className="w-12 px-4">
                            <SkeletonCheckbox />
                        </TableCell>
                        {Array.from({ length: columns }).map((_, colIndex) => (
                            <TableCell key={colIndex} className="px-4 py-3">
                                <Skeleton
                                    className={cn(
                                        'h-4',
                                        colIndex === 0
                                            ? nameWidths[rowIndex % nameWidths.length]
                                            : 'w-24',
                                    )}
                                />
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </>
    );
}

/** Loading state for full-bleed list pages. */
export function ListPageSkeleton({
    variant = 'generic',
    columns = 5,
    rows = 8,
    showChannelFilter = false,
    showAddButton = false,
}: ListPageSkeletonProps) {
    const resolvedVariant =
        variant === 'generic' && columns !== undefined ? 'generic' : variant;

    const showAdd =
        showAddButton || resolvedVariant === 'customers' || resolvedVariant === 'users';

    return (
        <div className={listPageFill} data-page-loading>
            <div className={cn(listPageCard, 'flex flex-1 flex-col min-h-0')}>
                <ToolbarSkeleton showAddButton={showAdd} showChannelFilter={showChannelFilter} />
                <div className="flex-1 min-h-0 overflow-auto border-t border-gray-200 dark:border-gray-800">
                    <Table containerClassName="overflow-visible">
                        {resolvedVariant === 'customers' && <CustomersSkeletonRows rows={rows} />}
                        {resolvedVariant === 'messages' && <MessagesSkeletonRows rows={rows} />}
                        {resolvedVariant === 'leads' && <LeadsSkeletonRows rows={rows} />}
                        {resolvedVariant === 'users' && <UsersSkeletonRows rows={rows} />}
                        {resolvedVariant === 'generic' && (
                            <GenericSkeletonRows columns={columns} rows={rows} />
                        )}
                    </Table>
                </div>
                <FooterSkeleton />
            </div>
        </div>
    );
}

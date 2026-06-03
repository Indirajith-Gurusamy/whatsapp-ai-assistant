'use client';

import { Search, Plus, Download, SlidersHorizontal, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const toolbarBtnHeight = 'h-10';

export interface ListPageToolbarProps {
    searchPlaceholder?: string;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    onAdd?: () => void;
    addLabel?: string;
    onExport?: () => void;
    isExporting?: boolean;
    onFilter?: () => void;
    showFilterButton?: boolean;
    /** Custom right-side actions (e.g. export dropdown). Replaces default action buttons when set. */
    actions?: React.ReactNode;
    /** Extra controls after default action buttons (e.g. table settings). */
    trailingActions?: React.ReactNode;
    className?: string;
}

export function ListPageToolbar({
    searchPlaceholder = 'Search...',
    searchValue = '',
    onSearchChange,
    onAdd,
    addLabel = 'Add',
    onExport,
    isExporting = false,
    onFilter,
    showFilterButton = false,
    actions,
    trailingActions,
    className,
}: ListPageToolbarProps) {
    const showSearch = onSearchChange !== undefined;

    return (
        <div className={cn('shrink-0 px-4 md:px-5 pt-4 pb-1', className)}>
            <div
                className={cn(
                    'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
                    'rounded-xl border border-border/60 bg-muted/30 px-4 py-3.5 shadow-sm',
                    'dark:border-border/40 dark:bg-muted/15 md:px-5 md:py-4',
                )}
            >
                {showSearch ? (
                    <div className="relative min-w-0 w-full flex-1 sm:max-w-xl">
                        <Search
                            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80"
                            aria-hidden
                        />
                        <Input
                            type="search"
                            placeholder={searchPlaceholder}
                            value={searchValue}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className={cn(
                                toolbarBtnHeight,
                                'rounded-full border-border/80 bg-background pl-11 pr-4 shadow-none',
                                'placeholder:text-muted-foreground/60',
                            )}
                        />
                    </div>
                ) : (
                    <div className="hidden flex-1 sm:block" aria-hidden />
                )}

                <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
                    {actions ?? (
                        <>
                            {onAdd && (
                                <Button
                                    onClick={onAdd}
                                    className={cn(
                                        toolbarBtnHeight,
                                        'shrink-0 gap-2 px-4',
                                        'bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white',
                                    )}
                                >
                                    <Plus className="h-4 w-4" />
                                    {addLabel}
                                </Button>
                            )}
                            {onExport && (
                                <Button
                                    onClick={onExport}
                                    variant="outline"
                                    disabled={isExporting}
                                    className={cn(toolbarBtnHeight, 'shrink-0 gap-2 px-4')}
                                >
                                    {isExporting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4" />
                                    )}
                                    {isExporting ? 'Exporting...' : 'Export'}
                                </Button>
                            )}
                            {showFilterButton && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className={cn(toolbarBtnHeight, 'w-10 shrink-0')}
                                    onClick={onFilter}
                                    type="button"
                                    aria-label="Filter"
                                >
                                    <SlidersHorizontal className="h-4 w-4" />
                                </Button>
                            )}
                            {trailingActions}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/** Slot for status filter tabs between toolbar and table. */
export function ListPageBelowToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                'shrink-0 border-b border-gray-200 px-4 pb-3 pt-1 dark:border-gray-800 md:px-5',
                className,
            )}
        >
            {children}
        </div>
    );
}

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
    /** Inline controls between search and action buttons (e.g. channel filter). */
    toolbarExtra?: React.ReactNode;
    className?: string;
}

/** Compact on mobile (icon-only), full label from sm+. */
export const toolbarInlineActionBtn = cn(
    toolbarBtnHeight,
    'shrink-0 gap-0 px-0 w-10 sm:w-auto sm:gap-2 sm:px-4',
);

export const toolbarFilterBtn = cn(toolbarBtnHeight, 'w-10 shrink-0');

/** Wrap action label text so it can hide on narrow screens. */
export function ToolbarActionLabel({ children }: { children: React.ReactNode }) {
    return <span className="hidden sm:inline">{children}</span>;
}

function FilterButton({ onClick }: { onClick?: () => void }) {
    return (
        <Button
            variant="outline"
            size="icon"
            className={toolbarFilterBtn}
            onClick={onClick}
            type="button"
            aria-label="Filter"
        >
            <SlidersHorizontal className="h-4 w-4" />
        </Button>
    );
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
    toolbarExtra,
    className,
}: ListPageToolbarProps) {
    const showSearch = onSearchChange !== undefined;
    const showFilter = showFilterButton && onFilter;

    const defaultActions = (
        <>
            {onAdd && (
                <Button
                    onClick={onAdd}
                    aria-label={addLabel}
                    className={cn(
                        toolbarInlineActionBtn,
                        'bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white',
                    )}
                >
                    <Plus className="h-4 w-4 shrink-0" />
                    <ToolbarActionLabel>{addLabel}</ToolbarActionLabel>
                </Button>
            )}
            {onExport && (
                <Button
                    onClick={onExport}
                    variant="outline"
                    disabled={isExporting}
                    aria-label={isExporting ? 'Exporting' : 'Export'}
                    className={toolbarInlineActionBtn}
                >
                    {isExporting ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                        <Download className="h-4 w-4 shrink-0" />
                    )}
                    <ToolbarActionLabel>
                        {isExporting ? 'Exporting...' : 'Export'}
                    </ToolbarActionLabel>
                </Button>
            )}
            {trailingActions}
        </>
    );

    const hasActions = Boolean(actions || onAdd || onExport || trailingActions || showFilter);

    return (
        <div className={cn('shrink-0 px-3 pt-3 pb-1 md:px-5 md:pt-4', className)}>
            <div
                className={cn(
                    'flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 shadow-sm',
                    'dark:border-border/40 dark:bg-muted/15 sm:gap-3 sm:px-4 sm:py-3 md:px-5 md:py-3.5',
                )}
            >
                <div className="flex min-w-0 flex-1 basis-[min(100%,12rem)] items-center gap-2">
                    {showSearch ? (
                        <div className="relative min-w-0 flex-1">
                            <Search
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80"
                                aria-hidden
                            />
                            <Input
                                type="search"
                                placeholder={searchPlaceholder}
                                value={searchValue}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className={cn(
                                    toolbarBtnHeight,
                                    'w-full min-w-0 rounded-full border-border/80 bg-background pl-9 pr-2 text-sm shadow-none sm:pl-10 sm:pr-4',
                                    'placeholder:text-muted-foreground/60',
                                )}
                            />
                        </div>
                    ) : (
                        <div className="min-w-0 flex-1" aria-hidden />
                    )}

                    {toolbarExtra}
                </div>

                {hasActions && (
                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                        {actions ?? defaultActions}
                        {showFilter && <FilterButton onClick={onFilter} />}
                    </div>
                )}
            </div>
        </div>
    );
}

/** Slot for status filter tabs between toolbar and table. */
export function ListPageBelowToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                'shrink-0 border-b border-gray-200 px-3 pb-3 pt-1 dark:border-gray-800 md:px-5',
                className,
            )}
        >
            {children}
        </div>
    );
}

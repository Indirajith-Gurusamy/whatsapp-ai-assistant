'use client';

import { useState, useMemo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ListPageToolbar, ListPageBelowToolbar } from '@/components/data/ListPageToolbar';
import { TableFilterModal } from '@/components/data/TableFilterModal';
import {
    applyTableFilters,
    type FilterCondition,
    type TableFilterField,
} from '@/lib/table-filter';
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';

interface Column<T> {
    key: string;
    header: string;
    cell: (item: T) => React.ReactNode;
    className?: string;
    searchable?: boolean;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    pageSize?: number;
    onRowClick?: (item: T) => void;
    className?: string;
    emptyMessage?: string;
    title?: string;
    searchPlaceholder?: string;
    onAdd?: () => void;
    onExport?: () => void;
    onFilter?: () => void;
    addLabel?: string;
    showSelection?: boolean;
    searchFields?: (keyof T)[];
    isExporting?: boolean;
    /** Renders between toolbar and table (e.g. status filter tabs). */
    belowToolbar?: React.ReactNode;
    /** Inline controls in the toolbar row (e.g. channel filter). */
    toolbarExtra?: React.ReactNode;
    showFilterButton?: boolean;
    /** Advanced multi-condition filter fields; enables filter modal when set. */
    filterFields?: TableFilterField[];
    /** card = full-bleed list layout (search row + flush table) */
    layout?: 'default' | 'card';
}

export function DataTable<T extends { id?: number | string }>({
    data,
    columns,
    pageSize: initialPageSize = 30,
    onRowClick,
    className,
    emptyMessage = "No data found",
    title,
    searchPlaceholder = "Search...",
    onAdd,
    onExport,
    onFilter,
    addLabel = 'Add',
    showSelection = true,
    searchFields,
    isExporting = false,
    belowToolbar,
    toolbarExtra,
    showFilterButton,
    filterFields,
    layout = 'card',
}: DataTableProps<T>) {
    const isCardLayout = layout === 'card';
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRows, setSelectedRows] = useState<Set<number | string>>(new Set());
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState<FilterCondition[]>([]);

    const filteredData = useMemo(() => {
        let result = data;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter((item) => {
                if (searchFields) {
                    return searchFields.some((field) => {
                        const value = item[field];
                        return value && String(value).toLowerCase().includes(query);
                    });
                }
                return Object.values(item as Record<string, unknown>).some(
                    (value) => value && String(value).toLowerCase().includes(query),
                );
            });
        }

        if (filterFields?.length && appliedFilters.length > 0) {
            result = applyTableFilters(
                result as (T & Record<string, unknown>)[],
                appliedFilters,
                filterFields,
            );
        }

        return result;
    }, [data, searchQuery, searchFields, appliedFilters, filterFields]);

    const totalPages = Math.ceil(filteredData.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    const handlePageSizeChange = (value: string) => {
        setPageSize(Number(value));
        setCurrentPage(1);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = pageData.map((item, index) => item.id ?? index);
            setSelectedRows(new Set(allIds));
        } else {
            setSelectedRows(new Set());
        }
    };

    const handleSelectRow = (id: number | string, checked: boolean) => {
        const newSelected = new Set(selectedRows);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedRows(newSelected);
    };

    const isAllSelected = pageData.length > 0 && pageData.every((item, index) =>
        selectedRows.has(item.id ?? index)
    );

    const hasFilterModal = Boolean(filterFields?.length);
    const showFilter = showFilterButton ?? (hasFilterModal || Boolean(onFilter));
    const handleFilterClick = hasFilterModal
        ? () => setFilterModalOpen(true)
        : onFilter;

    const stickyHeadClass = isCardLayout
        ? 'sticky top-0 z-10 bg-gray-50 shadow-[inset_0_-1px_0_0] shadow-gray-200 dark:bg-gray-900 dark:shadow-gray-800'
        : 'sticky top-0 z-10 bg-muted shadow-[inset_0_-1px_0_0] shadow-border';

    return (
        <div className={cn(isCardLayout && 'flex flex-1 flex-col min-h-0', className)}>
            <ListPageToolbar
                className={!isCardLayout ? 'px-0 pt-0' : undefined}
                searchPlaceholder={searchPlaceholder}
                searchValue={searchQuery}
                onSearchChange={(value) => {
                    setSearchQuery(value);
                    setCurrentPage(1);
                }}
                onAdd={onAdd}
                addLabel={addLabel}
                onExport={onExport}
                isExporting={isExporting}
                onFilter={handleFilterClick}
                showFilterButton={showFilter}
                trailingActions={
                    !isCardLayout ? (
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 shrink-0"
                            type="button"
                            aria-label="Table settings"
                        >
                            <Settings2 className="h-4 w-4" />
                        </Button>
                    ) : undefined
                }
                toolbarExtra={toolbarExtra}
            />

            {belowToolbar && <ListPageBelowToolbar>{belowToolbar}</ListPageBelowToolbar>}

            <div
                className={
                    isCardLayout
                        ? 'flex-1 min-h-0 overflow-auto border-t border-gray-200 dark:border-gray-800'
                        : 'overflow-auto rounded-lg border border-border bg-card'
                }
            >
                <Table containerClassName="overflow-visible">
                    <TableHeader>
                        <TableRow
                            className={
                                isCardLayout
                                    ? 'border-b-0 bg-transparent hover:bg-transparent'
                                    : 'border-b-0 bg-transparent hover:bg-transparent'
                            }
                        >
                            {showSelection && (
                                <TableHead className={cn('w-12 px-4', stickyHeadClass)}>
                                    <Checkbox
                                        checked={isAllSelected}
                                        onCheckedChange={handleSelectAll}
                                    />
                                </TableHead>
                            )}
                            {columns.map((column) => (
                                <TableHead
                                    key={column.key}
                                    className={cn(
                                        'px-4 py-3.5',
                                        stickyHeadClass,
                                        isCardLayout
                                            ? 'text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400'
                                            : 'text-xs font-medium text-muted-foreground',
                                        column.className,
                                    )}
                                >
                                    {column.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                        <TableBody>
                            {pageData.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length + (showSelection ? 1 : 0)}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        {emptyMessage}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pageData.map((item, index) => {
                                    const rowId = item.id ?? index;
                                    return (
                                        <TableRow
                                            key={rowId}
                                            onClick={() => onRowClick?.(item)}
                                            className={`${onRowClick ? 'cursor-pointer' : ''} ${
                                                isCardLayout
                                                    ? 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800'
                                                    : 'hover:bg-muted/30 border-b border-border/50'
                                            }`}
                                        >
                                            {showSelection && (
                                                <TableCell className="w-12 px-4">
                                                    <Checkbox
                                                        checked={selectedRows.has(rowId)}
                                                        onCheckedChange={(checked) =>
                                                            handleSelectRow(rowId, !!checked)
                                                        }
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </TableCell>
                                            )}
                                            {columns.map((column) => (
                                                <TableCell
                                                    key={column.key}
                                                    className={`px-4 py-3 ${column.className || ''}`}
                                                >
                                                    {column.cell(item)}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
            </div>

            <div
                className={cn(
                    'flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0',
                    isCardLayout
                        ? 'border-t border-gray-200 dark:border-gray-800 py-3 px-4 md:px-5'
                        : 'mt-4 px-2',
                )}
            >
                <p className="text-sm text-muted-foreground">
                    {filteredData.length === 0 ? 0 : startIndex + 1} – {endIndex} of {filteredData.length}
                </p>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rows per page</span>
                    <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                        <SelectTrigger className="w-[70px] h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="30">30</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1 ml-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {hasFilterModal && filterFields && (
                <TableFilterModal
                    open={filterModalOpen}
                    onOpenChange={setFilterModalOpen}
                    fields={filterFields}
                    data={data as (T & Record<string, unknown>)[]}
                    appliedConditions={appliedFilters}
                    onApply={(conditions) => {
                        setAppliedFilters(conditions);
                        setCurrentPage(1);
                    }}
                />
            )}
        </div>
    );
}

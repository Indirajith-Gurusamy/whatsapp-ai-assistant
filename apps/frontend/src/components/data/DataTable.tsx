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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    ChevronLeft,
    ChevronRight,
    Search,
    Plus,
    Download,
    SlidersHorizontal,
    Settings2,
} from 'lucide-react';

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
    showSelection?: boolean;
    searchFields?: (keyof T)[];
}

export function DataTable<T extends { id?: number | string }>({
    data,
    columns,
    pageSize: initialPageSize = 30,
    onRowClick,
    className,
    emptyMessage = "No data found",
    title,
    searchPlaceholder = "Search",
    onAdd,
    onExport,
    showSelection = true,
    searchFields,
}: DataTableProps<T>) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRows, setSelectedRows] = useState<Set<number | string>>(new Set());

    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return data;

        const query = searchQuery.toLowerCase();
        return data.filter((item) => {
            if (searchFields) {
                return searchFields.some((field) => {
                    const value = item[field];
                    return value && String(value).toLowerCase().includes(query);
                });
            }
            return Object.values(item as Record<string, unknown>).some(
                (value) => value && String(value).toLowerCase().includes(query)
            );
        });
    }, [data, searchQuery, searchFields]);

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

    return (
        <div className={className}>
            {/* Header with Title, Search, and Actions */}
            <div className="flex flex-col gap-4 mb-4">
                {title && (
                    <h1 className="text-xl font-semibold">{title}</h1>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Search */}
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-10 h-9 bg-background"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {onAdd && (
                            <Button
                                onClick={onAdd}
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                            </Button>
                        )}
                        {onExport && (
                            <Button
                                onClick={onExport}
                                variant="outline"
                                size="sm"
                            >
                                <Download className="h-4 w-4 mr-1" />
                                Export
                            </Button>
                        )}
                        <Button variant="outline" size="icon" className="h-9 w-9">
                            <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9">
                            <Settings2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b">
                                {showSelection && (
                                    <TableHead className="w-12 px-4">
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </TableHead>
                                )}
                                {columns.map((column) => (
                                    <TableHead
                                        key={column.key}
                                        className={`text-xs font-medium text-muted-foreground px-4 py-3 ${column.className || ''}`}
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
                                            className={`${onRowClick ? 'cursor-pointer' : ''} hover:bg-muted/30 border-b border-border/50`}
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
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
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
        </div>
    );
}

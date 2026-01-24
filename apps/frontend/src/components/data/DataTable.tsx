'use client';

import { useState } from 'react';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
    key: string;
    header: string;
    cell: (item: T) => React.ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    pageSize?: number;
    onRowClick?: (item: T) => void;
    className?: string;
    emptyMessage?: string;
}

export function DataTable<T extends { id?: number | string }>({
    data,
    columns,
    pageSize: initialPageSize = 25,
    onRowClick,
    className,
    emptyMessage = "No data found",
}: DataTableProps<T>) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);

    const totalPages = Math.ceil(data.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, data.length);
    const pageData = data.slice(startIndex, endIndex);

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    const handlePageSizeChange = (value: string) => {
        setPageSize(Number(value));
        setCurrentPage(1);
    };

    return (
        <div className={className}>
            <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                {columns.map((column) => (
                                    <TableHead
                                        key={column.key}
                                        className={`text-xs font-semibold uppercase tracking-wider ${column.className || ''}`}
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
                                        colSpan={columns.length}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        {emptyMessage}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pageData.map((item, index) => (
                                    <TableRow
                                        key={item.id ?? index}
                                        onClick={() => onRowClick?.(item)}
                                        className={onRowClick ? 'cursor-pointer' : undefined}
                                    >
                                        {columns.map((column) => (
                                            <TableCell key={column.key} className={column.className}>
                                                {column.cell(item)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
                <p className="text-sm text-muted-foreground">
                    Showing {data.length === 0 ? 0 : startIndex + 1}-{endIndex} of {data.length}
                </p>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline ml-1">Previous</span>
                    </Button>

                    <div className="flex items-center gap-1">
                        <Input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={currentPage}
                            onChange={(e) => goToPage(Number(e.target.value))}
                            className="w-16 h-8 text-center"
                        />
                        <span className="text-sm text-muted-foreground">of {totalPages || 1}</span>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                    >
                        <span className="hidden sm:inline mr-1">Next</span>
                        <ChevronRight className="w-4 h-4" />
                    </Button>

                    <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                        <SelectTrigger className="w-[100px] h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10 / page</SelectItem>
                            <SelectItem value="25">25 / page</SelectItem>
                            <SelectItem value="50">50 / page</SelectItem>
                            <SelectItem value="100">100 / page</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}

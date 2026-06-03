import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface TableSkeletonProps {
    columns: number;
    rows?: number;
    title?: string;
    showHeader?: boolean;
    showActions?: boolean;
}

export function TableSkeleton({
    columns,
    rows = 5,
    title,
    showHeader = true,
    showActions = true,
}: TableSkeletonProps) {
    const totalColumns = showActions ? columns + 1 : columns;
    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
                <Table>
                    {showHeader && (
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                {Array.from({ length: totalColumns }).map((_, i) => (
                                    <TableHead key={i}>
                                        <Skeleton className="h-4 w-20" />
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                    )}
                    <TableBody>
                        {Array.from({ length: rows }).map((_, rowIndex) => (
                            <TableRow key={rowIndex}>
                                {Array.from({ length: totalColumns }).map((_, colIndex) => (
                                    <TableCell key={colIndex}>
                                        <Skeleton className="h-4 w-full max-w-[120px]" />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

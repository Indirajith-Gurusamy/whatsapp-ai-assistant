'use client';

import { useMessages } from '@/hooks/useMessages';
import { DataTable } from '@/components/data/DataTable';
import { TableSkeleton } from '@/components/data/TableSkeleton';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Download } from 'lucide-react';
import type { Message } from '@/types';

function formatDate(dateString: string | null | undefined): { date: string; time: string } {
    if (!dateString) return { date: '-', time: '' };
    const date = new Date(dateString);
    return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
}

export default function MessagesPage() {
    const { messages, isLoading } = useMessages();

    const handleViewDetails = (message: Message) => {
        console.log('View message:', message);
    };

    const handleDownload = (message: Message) => {
        console.log('Download message:', message);
    };

    const handleExport = () => {
        const csvContent = messages.map(m =>
            `"${m.name || 'User'}","${m.phone}","${m.message.replace(/"/g, '""')}","${m.timestamp}"`
        ).join('\n');
        const header = '"Name","Phone","Message","Timestamp"\n';
        const blob = new Blob([header + csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'messages.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const columns = [
        {
            key: 'name',
            header: 'Name',
            cell: (item: Message) => (
                <span className="text-indigo-600 hover:text-indigo-800 font-medium">
                    {item.name || 'User'}
                </span>
            ),
        },
        {
            key: 'phone',
            header: 'Phone',
            cell: (item: Message) => (
                <span className="text-muted-foreground">+{item.phone}</span>
            ),
        },
        {
            key: 'message',
            header: 'Message',
            cell: (item: Message) => (
                <div className="max-w-[300px] truncate text-muted-foreground">
                    {item.message.substring(0, 80)}
                </div>
            ),
        },
        {
            key: 'timestamp',
            header: 'Timestamp',
            cell: (item: Message) => {
                const { date, time } = formatDate(item.timestamp);
                return (
                    <div className="text-right">
                        <div className="font-medium text-sm">{date}</div>
                        <div className="text-xs text-muted-foreground">{time}</div>
                    </div>
                );
            },
            className: 'text-right hidden md:table-cell',
        },
        {
            key: 'actions',
            header: '',
            cell: (item: Message) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(item);
                            }}
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(item);
                            }}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            className: 'w-12',
        },
    ];

    if (isLoading) {
        return (
            <div className="p-4 md:p-6">
                <TableSkeleton columns={5} rows={10} title="Messages" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            <DataTable
                data={messages}
                columns={columns}
                onRowClick={handleViewDetails}
                title="Messages"
                searchPlaceholder="Search"
                onExport={handleExport}
                searchFields={['name', 'phone', 'message'] as (keyof Message)[]}
            />
        </div>
    );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMessages } from '@/hooks/useMessages';
import { useCustomers } from '@/hooks/useCustomers';
import { DataTable } from '@/components/data/DataTable';
import { ListPageSkeleton } from '@/components/data/ListPageSkeleton';
import { ListPageShell } from '@/components/data/ListPageShell';
import { messageFilterFields } from '@/lib/table-filter-presets';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Download } from 'lucide-react';
import type { Message } from '@/types';
import { toast } from 'sonner';

function formatDate(dateString: string | null | undefined): { date: string; time: string } {
    if (!dateString) return { date: '-', time: '' };
    const date = new Date(dateString);
    return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
}

function downloadMessage(message: Message) {
    const lines = [
        `Name: ${message.name || 'User'}`,
        `Phone: +${message.phone}`,
        `Timestamp: ${message.timestamp}`,
        '',
        message.message,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `message-${message.phone}-${message.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
}

export default function MessagesPage() {
    const router = useRouter();
    const { messages, isLoading } = useMessages();
    const { customers } = useCustomers();
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

    const resolveCustomerUuid = (message: Message) => {
        if (message.customer_uuid) return message.customer_uuid;
        return customers.find((c) => c.phone === message.phone)?.uuid ?? null;
    };

    const handleViewDetails = (message: Message) => {
        const customerUuid = resolveCustomerUuid(message);
        if (customerUuid) {
            router.push(`/customers/${customerUuid}?from=messages`);
            return;
        }
        setSelectedMessage(message);
    };

    const handleDownload = (message: Message) => {
        downloadMessage(message);
        toast.success('Message downloaded');
    };

    const handleExport = () => {
        if (messages.length === 0) {
            toast.error('No messages to export');
            return;
        }
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
        toast.success('Messages exported');
    };

    const columns = [
        {
            key: 'name',
            header: 'NAME',
            cell: (item: Message) => (
                <span className="font-medium text-gray-900 dark:text-gray-100">
                    {item.name || 'User'}
                </span>
            ),
        },
        {
            key: 'phone',
            header: 'PHONE',
            cell: (item: Message) => (
                <span className="text-gray-600 tabular-nums dark:text-gray-400">+{item.phone}</span>
            ),
        },
        {
            key: 'message',
            header: 'MESSAGE',
            cell: (item: Message) => (
                <div className="max-w-[300px] truncate text-muted-foreground">
                    {item.message.substring(0, 80)}
                </div>
            ),
        },
        {
            key: 'timestamp',
            header: 'TIMESTAMP',
            cell: (item: Message) => {
                const { date, time } = formatDate(item.timestamp);
                return (
                    <div className="text-right">
                        <div className="text-sm font-medium">{date}</div>
                        <div className="text-xs text-muted-foreground">{time}</div>
                    </div>
                );
            },
            className: 'text-right hidden md:table-cell',
        },
        {
            key: 'actions',
            header: 'ACTIONS',
            cell: (item: Message) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Row actions"
                        >
                            <MoreVertical className="h-4 w-4 text-gray-500" />
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
            className: 'w-[72px] text-right',
        },
    ];

    if (isLoading) {
        return <ListPageSkeleton columns={5} />;
    }

    return (
        <ListPageShell>
            <DataTable
                className="flex flex-1 flex-col min-h-0"
                data={messages}
                columns={columns}
                onRowClick={handleViewDetails}
                searchPlaceholder="Search..."
                onExport={handleExport}
                searchFields={['name', 'phone', 'message'] as (keyof Message)[]}
                filterFields={messageFilterFields}
            />

            <Dialog open={selectedMessage !== null} onOpenChange={(open) => !open && setSelectedMessage(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Message details</DialogTitle>
                        <DialogDescription>
                            {selectedMessage?.name || 'User'} · +{selectedMessage?.phone}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedMessage && (
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                                {formatDate(selectedMessage.timestamp).date}{' '}
                                {formatDate(selectedMessage.timestamp).time}
                            </p>
                            <div className="rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                                {selectedMessage.message}
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => handleDownload(selectedMessage)}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </ListPageShell>
    );
}

'use client';

import { useMessages } from '@/hooks/useMessages';
import { DataTable } from '@/components/data/DataTable';
import type { Message } from '@/types';

export default function MessagesPage() {
    const { messages, isLoading } = useMessages();

    const columns = [
        {
            key: 'name',
            header: 'Name',
            cell: (item: Message) => (
                <div className="font-medium">{item.name || 'User'}</div>
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
            cell: (item: Message) => (
                <span className="text-xs text-muted-foreground">{item.timestamp}</span>
            ),
            className: 'hidden md:table-cell',
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">Messages</h1>
                <p className="text-muted-foreground">All incoming WhatsApp messages</p>
            </div>

            {/* Data Table */}
            <DataTable
                data={messages}
                columns={columns}
            />
        </div>
    );
}

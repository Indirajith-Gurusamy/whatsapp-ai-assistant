'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMessages } from '@/hooks/useMessages';
import { useCustomers } from '@/hooks/useCustomers';
import { DataTable } from '@/components/data/DataTable';
import { ListPageSkeleton } from '@/components/data/ListPageSkeleton';
import { ListPageShell } from '@/components/data/ListPageShell';
import { ChannelBadge } from '@/components/data/ChannelBadge';
import { ChannelFilterDropdown, type ChannelFilter } from '@/components/data/ChannelFilterDropdown';
import { messageFilterFields } from '@/lib/table-filter-presets';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Download, ExternalLink } from 'lucide-react';
import type { Message } from '@/types';
import { toast } from 'sonner';
import { EmailMessageBody } from '@/components/email/EmailMessageBody';
import { parseEmailContent } from '@/lib/email-content';
import { formatDateParts, formatDateTimeLong } from '@/lib/date';
import { markEmailAsRead } from '@/lib/api';

function downloadMessage(message: Message) {
    const contact =
        message.channel === 'email'
            ? message.email || message.phone
            : message.phone
              ? `+${message.phone}`
              : '';
    const lines = [
        `Name: ${message.name || 'User'}`,
        `Contact: ${contact}`,
        `Timestamp: ${message.timestamp}`,
        '',
        message.message,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `message-${message.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
}

export default function MessagesPage() {
    const router = useRouter();
    const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
    const { messages, isLoading } = useMessages(500, channelFilter);
    const { customers } = useCustomers();
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

    const resolveCustomerUuid = (message: Message) => {
        if (message.customer_uuid) return message.customer_uuid;
        if (message.email) {
            const byEmail = customers.find((c) => c.email === message.email);
            if (byEmail) return byEmail.uuid;
        }
        return customers.find((c) => c.phone === message.phone)?.uuid ?? null;
    };

    const handleRowClick = (message: Message) => {
        setSelectedMessage(message);
        if (message.channel === 'email') {
            markEmailAsRead(message.id).catch(() => {});
        }
    };

    const handleOpenCustomer = (message: Message) => {
        const customerUuid = resolveCustomerUuid(message);
        if (!customerUuid) {
            toast.error('Customer not found for this message');
            return;
        }
        const channel = message.channel || 'whatsapp';
        router.push(`/customers/${customerUuid}?from=messages&channel=${channel}`);
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
        const csvContent = messages
            .map((m) => {
                const channel = m.channel || 'whatsapp';
                const contact =
                    channel === 'email'
                        ? m.email || m.phone || ''
                        : m.phone
                          ? `+${m.phone}`
                          : '';
                return `"${(m.name || 'User').replace(/"/g, '""')}","${channel}","${contact.replace(/"/g, '""')}","${m.message.replace(/"/g, '""')}","${m.timestamp}"`;
            })
            .join('\n');
        const header = '"Name","Channel","Contact","Message","Timestamp"\n';
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
        ...(channelFilter === 'all'
            ? [
                  {
                      key: 'channel',
                      header: 'CHANNEL',
                      cell: (item: Message) => <ChannelBadge channel={item.channel} />,
                  },
              ]
            : []),
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
            key: 'contact',
            header: 'CONTACT',
            cell: (item: Message) => (
                <span className="text-gray-600 dark:text-gray-400">
                    {item.channel === 'email'
                        ? item.email || item.phone
                        : item.phone
                          ? `+${item.phone}`
                          : '-'}
                </span>
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
                const { date, time } = formatDateParts(item.timestamp);
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
                                handleRowClick(item);
                            }}
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            View message
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCustomer(item);
                            }}
                        >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open customer
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
        return <ListPageSkeleton variant="messages" showChannelFilter />;
    }

    return (
        <ListPageShell>
            <DataTable
                className="flex flex-1 flex-col min-h-0"
                data={messages}
                columns={columns}
                onRowClick={handleRowClick}
                searchPlaceholder="Search..."
                onExport={handleExport}
                searchFields={['name', 'phone', 'email', 'message'] as (keyof Message)[]}
                filterFields={messageFilterFields}
                toolbarExtra={
                    <ChannelFilterDropdown value={channelFilter} onChange={setChannelFilter} />
                }
            />

            <Dialog open={selectedMessage !== null} onOpenChange={(open) => !open && setSelectedMessage(null)}>
                <DialogContent
                    className={
                        selectedMessage?.channel === 'email'
                            ? 'flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl'
                            : 'flex max-h-[min(90vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg'
                    }
                >
                    {selectedMessage && (
                        <>
                            <DialogHeader className="shrink-0 space-y-1 border-b px-5 py-4 pr-12 text-left sm:px-6">
                                <DialogTitle className="flex flex-wrap items-center gap-2 text-base leading-snug">
                                    {selectedMessage.channel === 'email' ? 'Email message' : 'Message'}
                                    <ChannelBadge channel={selectedMessage.channel} />
                                </DialogTitle>
                                <DialogDescription className="break-all">
                                    {selectedMessage.name || 'User'} ·{' '}
                                    {selectedMessage.channel === 'email'
                                        ? selectedMessage.email
                                        : selectedMessage.phone
                                          ? `+${selectedMessage.phone}`
                                          : ''}
                                </DialogDescription>
                                <p className="text-xs text-muted-foreground">
                                    {formatDateTimeLong(selectedMessage.timestamp)}
                                </p>
                                {selectedMessage.channel === 'email' && (
                                    <p className="pt-1 text-sm font-semibold leading-snug text-foreground break-words [overflow-wrap:anywhere]">
                                        {parseEmailContent(selectedMessage.message).subject}
                                    </p>
                                )}
                            </DialogHeader>

                            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 sm:px-6">
                                {selectedMessage.channel === 'email' ? (
                                    <EmailMessageBody
                                        body={parseEmailContent(selectedMessage.message).body}
                                        htmlBody={selectedMessage.html_body}
                                    />
                                ) : (
                                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                                        {selectedMessage.message}
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="shrink-0 border-t px-5 py-4 sm:px-6">
                                {resolveCustomerUuid(selectedMessage) && (
                                    <Button
                                        variant="outline"
                                        onClick={() => handleOpenCustomer(selectedMessage)}
                                    >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Open customer
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => handleDownload(selectedMessage)}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </ListPageShell>
    );
}

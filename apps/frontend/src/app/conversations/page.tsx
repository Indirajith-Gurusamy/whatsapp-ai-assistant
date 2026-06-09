'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useConversations } from '@/hooks/useConversations';
import { ChannelBadge } from '@/components/data/ChannelBadge';
import { ChannelFilterDropdown, type ChannelFilter } from '@/components/data/ChannelFilterDropdown';
import { useTeamUsers } from '@/hooks/useTeamUsers';
import { useAuth } from '@/contexts/AuthContext';
import { AssigneeCell } from '@/components/data/AssigneeCell';
import { formatAssigneeLabel } from '@/lib/assignee';
import { fetchConversationDetailByUuid } from '@/lib/api';
import { toast } from 'sonner';
import { DataTable } from '@/components/data/DataTable';
import { ListPageSkeleton } from '@/components/data/ListPageSkeleton';
import { ListPageShell } from '@/components/data/ListPageShell';
import { StatusBadge } from '@/components/data/StatusBadge';
import { DetailModal } from '@/components/modals/DetailModal';
import { Button } from '@/components/ui/button';
import { MoreVertical, UserPlus, Eye } from 'lucide-react';
import type { Conversation, ConversationDetail } from '@/types';
import { formatDateTime } from '@/lib/date';
import { conversationFilterFields } from '@/lib/table-filter-presets';
import { AssignLeadModal } from '@/components/modals/AssignLeadModal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
export default function ConversationsPage() {
    const searchParams = useSearchParams();
    const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
    const { conversations, isLoading, refresh } = useConversations(500, channelFilter);
    const { isAdmin, user } = useAuth();
    const { emailToName } = useTeamUsers(isAdmin());
    const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assignTarget, setAssignTarget] = useState<{ uuid: string; assignedTo?: string | null } | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const openedFromUrl = useRef<string | null>(null);

    const handleExport = async () => {
        if (conversations.length === 0) {
            toast.warning('No data available to export');
            return;
        }

        setIsExporting(true);

        try {
            // Give a small delay to show the animation feel
            await new Promise(resolve => setTimeout(resolve, 800));

            // Define CSV headers
            const headers = [
                'ID',
                'Channel',
                'Contact',
                'Name',
                'Assigned To',
                'Time',
                'Message',
                'Status',
                'Comments'
            ];

            // Convert data to CSV rows
            const rows = conversations.map(conv => [
                conv.message_id,
                conv.channel || 'whatsapp',
                conv.channel === 'email'
                    ? `"${(conv.email || conv.phone || '').replace(/"/g, '""')}"`
                    : `="${conv.phone}"`,
                conv.name || 'Unknown',
                formatAssigneeLabel(conv.assigned_to, emailToName, user?.email),
                conv.message_time,
                `"${(conv.message || '').replace(/"/g, '""')}"`, // Escape quotes and wrap in quotes
                conv.lead_status,
                `"${(conv.comments || '').replace(/"/g, '""')}"`
            ]);

            // Combine headers and rows
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            // Create blob and trigger download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            link.setAttribute('href', url);
            link.setAttribute('download', `conversations_export_${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to generate export file');
        } finally {
            setIsExporting(false);
        }
    };

    const handleRowClick = async (conversation: Conversation) => {
        try {
            const detail = await fetchConversationDetailByUuid(conversation.uuid);
            setSelectedConversation(detail);
            setDetailModalOpen(true);
        } catch (error) {
            console.error('Failed to fetch conversation detail:', error);
            toast.error('Failed to load conversation');
        }
    };

    useEffect(() => {
        const openUuid = searchParams.get('open');
        if (!openUuid || isLoading || openedFromUrl.current === openUuid) return;
        openedFromUrl.current = openUuid;

        const existing = conversations.find((c) => c.uuid === openUuid);
        if (existing) {
            void fetchConversationDetailByUuid(existing.uuid)
                .then((detail) => {
                    setSelectedConversation(detail);
                    setDetailModalOpen(true);
                })
                .catch((error) => {
                    console.error('Failed to open conversation from URL:', error);
                    toast.error('Conversation not found');
                });
            return;
        }

        void fetchConversationDetailByUuid(openUuid)
            .then((detail) => {
                setSelectedConversation(detail);
                setDetailModalOpen(true);
            })
            .catch((error) => {
                console.error('Failed to open conversation from URL:', error);
                toast.error('Conversation not found');
            });
    }, [searchParams, conversations, isLoading]);

    const handleAssignClick = (conversation: Conversation) => {
        setAssignTarget({
            uuid: conversation.uuid,
            assignedTo: conversation.assigned_to
        });
        setAssignModalOpen(true);
    };

    const columns = useMemo(() => [
        ...(channelFilter === 'all'
            ? [
                  {
                      key: 'channel',
                      header: 'Channel',
                      cell: (item: Conversation) => (
                          <ChannelBadge channel={item.channel} />
                      ),
                  },
              ]
            : []),
        {
            key: 'name',
            header: 'Name',
            cell: (item: Conversation) => (
                <div className="font-medium">{item.name || 'User'}</div>
            ),
        },
        {
            key: 'contact',
            header: 'Contact',
            cell: (item: Conversation) => (
                <span className="text-muted-foreground">
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
            header: 'Message',
            cell: (item: Conversation) => (
                <div className="max-w-[200px] truncate text-muted-foreground">
                    {item.message.substring(0, 50)}
                </div>
            ),
            className: 'hidden md:table-cell',
        },
        {
            key: 'message_time',
            header: 'Message Time',
            cell: (item: Conversation) => (
                <span className="text-xs text-muted-foreground">
                    {item.message_time ? formatDateTime(item.message_time) : '-'}
                </span>
            ),
            className: 'hidden lg:table-cell',
        },
        {
            key: 'status',
            header: 'Status',
            cell: (item: Conversation) => (
                <div className="flex min-w-0 max-w-[5.5rem] sm:max-w-none items-center gap-1.5">
                    <StatusBadge status={item.lead_status} />
                    {item.ai_enabled === false && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" title="Human agent is in control">
                            👤
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'assigned_to',
            header: 'Assigned To',
            cell: (item: Conversation) => (
                <AssigneeCell
                    email={item.assigned_to}
                    emailToName={emailToName}
                    currentUserEmail={user?.email}
                />
            ),
            className: 'hidden sm:table-cell',
        },
        {
            key: 'action',
            header: 'ACTIONS',
            cell: (item: Conversation) => (
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
                            View Details
                        </DropdownMenuItem>
                        {isAdmin() && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAssignClick(item);
                                }}
                            >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Assign Lead
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            className: 'w-[72px] text-right',
        },
    ], [channelFilter, emailToName, user?.email, isAdmin]);

    if (isLoading) {
        return <ListPageSkeleton variant="leads" showChannelFilter />;
    }

    return (
        <ListPageShell>
            <DataTable
                className="flex flex-1 flex-col min-h-0"
                data={conversations.map(c => ({ ...c, id: c.uuid }))}
                columns={columns}
                onRowClick={(item) => handleRowClick(item as Conversation)}
                emptyMessage="No leads found"
                searchPlaceholder="Search..."
                onExport={handleExport}
                isExporting={isExporting}
                searchFields={['name', 'phone', 'email', 'message', 'assigned_to'] as (keyof Conversation)[]}
                filterFields={conversationFilterFields}
                toolbarExtra={
                    <ChannelFilterDropdown value={channelFilter} onChange={setChannelFilter} />
                }
            />

            <DetailModal
                conversation={selectedConversation}
                open={detailModalOpen}
                onOpenChange={setDetailModalOpen}
                onUpdate={refresh}
            />

            <AssignLeadModal
                conversationId={assignTarget?.uuid || null}
                currentAssignee={assignTarget?.assignedTo}
                open={assignModalOpen}
                onOpenChange={setAssignModalOpen}
                onSuccess={refresh}
            />
        </ListPageShell>
    );
}

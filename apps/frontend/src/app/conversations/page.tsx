'use client';

import { useState, useMemo, useEffect } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useNotifications } from '@/hooks/useNotifications';
import { fetchConversationDetail } from '@/lib/api';
import { toast } from 'sonner';
import { DataTable } from '@/components/data/DataTable';
import { StatusBadge } from '@/components/data/StatusBadge';
import { DetailModal } from '@/components/modals/DetailModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Loader2, MoreHorizontal, UserPlus } from 'lucide-react';
import type { Conversation, ConversationDetail, LeadStatus } from '@/types';
import { AssignLeadModal } from '@/components/modals/AssignLeadModal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const filterTabs: { key: string; label: string; status: LeadStatus | null }[] = [
    { key: 'all', label: 'All', status: null },
    { key: 'new', label: 'New Lead', status: 'new lead' },
    { key: 'sent', label: 'App Sent', status: 'application sent' },
    { key: 'in', label: 'App In', status: 'application in' },
    { key: 'nurture', label: 'Nurture', status: 'nurture' },
    { key: 'hold', label: 'On Hold', status: 'on hold' },
    { key: 'lost', label: 'Lost', status: 'lost' },
];

export default function ConversationsPage() {
    const { conversations, isLoading, refresh } = useConversations();
    const { markAsRead } = useNotifications();
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assignTarget, setAssignTarget] = useState<{ id: number; assignedTo?: string | null } | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Mark notifications as read when visiting this page
    useEffect(() => {
        markAsRead();
    }, [markAsRead]);

    const filteredConversations = useMemo(() => {
        const filter = filterTabs.find(t => t.key === activeFilter);
        if (!filter?.status) return conversations;
        return conversations.filter(c => c.lead_status === filter.status);
    }, [conversations, activeFilter]);

    const handleExport = async () => {
        if (filteredConversations.length === 0) {
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
                'Phone',
                'Name',
                'Time',
                'Message',
                'Status',
                'Response',
                'Response Time',
                'Comments'
            ];

            // Convert data to CSV rows
            const rows = filteredConversations.map(conv => [
                conv.message_id,
                `="${conv.phone}"`, // Force Excel to treat phone as string
                conv.name || 'Unknown',
                conv.message_time,
                `"${(conv.message || '').replace(/"/g, '""')}"`, // Escape quotes and wrap in quotes
                conv.lead_status,
                `"${(conv.response || '').replace(/"/g, '""')}"`,
                conv.response_time || '',
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
            // Use 'message_id' as it is the primary key from old API
            const detail = await fetchConversationDetail(conversation.message_id);
            setSelectedConversation(detail);
            setDetailModalOpen(true);
        } catch (error) {
            console.error('Failed to fetch conversation detail:', error);
        }
    };

    const handleAssignClick = (conversation: Conversation) => {
        setAssignTarget({
            id: conversation.message_id,
            assignedTo: conversation.assigned_to
        });
        setAssignModalOpen(true);
    };

    const calculateResponseHours = (messageTime: string | null, responseTime: string | null) => {
        if (!messageTime || !responseTime) return '-';
        try {
            const msgDate = new Date(messageTime);
            const respDate = new Date(responseTime);
            const diffMs = respDate.getTime() - msgDate.getTime();
            const diffHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
            return `${diffHours}h`;
        } catch {
            return '-';
        }
    };

    const columns = [
        {
            key: 'name',
            header: 'Name',
            cell: (item: Conversation) => (
                <div className="font-medium">{item.name || 'User'}</div>
            ),
        },
        {
            key: 'phone',
            header: 'Phone',
            cell: (item: Conversation) => (
                <span className="text-muted-foreground">+{item.phone}</span>
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
                    {item.message_time ? new Date(item.message_time).toLocaleString() : '-'}
                </span>
            ),
            className: 'hidden lg:table-cell',
        },
        {
            key: 'response_time',
            header: 'Response',
            cell: (item: Conversation) => (
                <span className="text-xs text-muted-foreground">
                    {calculateResponseHours(item.message_time, item.response_time)}
                </span>
            ),
            className: 'hidden lg:table-cell',
        },
        {
            key: 'status',
            header: 'Status',
            cell: (item: Conversation) => <StatusBadge status={item.lead_status} />,
        },
        {
            key: 'action',
            header: 'Action',
            cell: (item: Conversation) => (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleRowClick(item)}>
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAssignClick(item)}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Assign Lead
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Leads</h1>
                    <p className="text-muted-foreground">Manage and assign leads</p>
                </div>
                <Button
                    variant="outline"
                    className="w-fit"
                    onClick={handleExport}
                    disabled={isExporting}
                >
                    {isExporting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4 mr-2" />
                    )}
                    {isExporting ? 'Exporting...' : 'Export'}
                </Button>
            </div>

            {/* Filter Tabs */}
            <Tabs value={activeFilter} onValueChange={setActiveFilter}>
                <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
                    {filterTabs.map((tab) => (
                        <TabsTrigger
                            key={tab.key}
                            value={tab.key}
                            className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none px-4"
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* Data Table */}
            <DataTable
                data={filteredConversations.map(c => ({ ...c, id: c.message_id }))}
                columns={columns}
                onRowClick={(item) => handleRowClick(item as Conversation)}
                emptyMessage="No leads assigned"
            />

            {/* Detail Modal */}
            <DetailModal
                conversation={selectedConversation}
                open={detailModalOpen}
                onOpenChange={setDetailModalOpen}
                onUpdate={refresh}
            />

            <AssignLeadModal
                conversationId={assignTarget?.id || null}
                currentAssignee={assignTarget?.assignedTo}
                open={assignModalOpen}
                onOpenChange={setAssignModalOpen}
                onSuccess={refresh}
            />
        </div>
    );
}

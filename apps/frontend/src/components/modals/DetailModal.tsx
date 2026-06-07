'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { updateConversationStatusByUuid } from '@/lib/api';
import type { ConversationDetail, LeadStatus } from '@/types';
import { toast } from 'sonner';
import { themeClasses } from '@/lib/theme';
import { AssigneeCell } from '@/components/data/AssigneeCell';
import { useTeamUsers } from '@/hooks/useTeamUsers';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/lib/date';

const statusOptions: { value: LeadStatus; label: string }[] = [
    { value: 'new lead', label: 'New Lead' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'application sent', label: 'Application Sent' },
    { value: 'application in', label: 'Application In' },
    { value: 'nurture', label: 'Nurture' },
    { value: 'follow up', label: 'Follow Up' },
    { value: 'on hold', label: 'On Hold' },
    { value: 'lost', label: 'Lost' },
    { value: 'duplicate', label: 'Duplicate' },
    { value: 'closed', label: 'Closed' },
];

interface DetailModalProps {
    conversation: ConversationDetail | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

export function DetailModal({
    conversation,
    open,
    onOpenChange,
    onUpdate,
}: DetailModalProps) {
    const { isAdmin, user } = useAuth();
    const { emailToName } = useTeamUsers(isAdmin());
    const [status, setStatus] = useState<LeadStatus>(conversation?.lead_status || 'new lead');
    const [comments, setComments] = useState(conversation?.comments || '');
    const [isUpdating, setIsUpdating] = useState(false);

    // Update local state when conversation changes
    useEffect(() => {
        if (conversation) {
            setStatus(conversation.lead_status || 'new lead');
            setComments(conversation.comments || '');
        }
    }, [conversation]);

    const handleUpdate = async () => {
        if (!conversation) return;

        setIsUpdating(true);
        try {
            await updateConversationStatusByUuid(conversation.uuid, status, comments);
            toast.success('Status updated successfully');
            onOpenChange(false);
            onUpdate?.();
        } catch (error) {
            toast.error('Failed to update status');
            console.error(error);
        } finally {
            setIsUpdating(false);
        }
    };

    if (!conversation) return null;

    const calculateResponseHours = () => {
        if (!conversation.message_time || !conversation.response_time) return '-';
        try {
            const msgDate = new Date(conversation.message_time);
            const respDate = new Date(conversation.response_time);
            const diffMs = respDate.getTime() - msgDate.getTime();
            const diffHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
            return `${diffHours}h`;
        } catch {
            return '-';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                {/* Sticky Header */}
                <DialogHeader className="sticky top-0 z-10 bg-background border-b px-4 sm:px-6 py-4 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle>Lead Details</DialogTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onOpenChange(false)}
                        className="h-8 w-8 rounded-full"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                </DialogHeader>

                {/* Scrollable Content */}
                <div className="overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 space-y-6 flex-1">
                    {/* Lead Information */}
                    <section className="space-y-3">
                        <h3 className={`font-semibold text-sm border-b-2 ${themeClasses.borderPrimary} pb-2`}>
                            Lead Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,6.5rem)_1fr] gap-x-3 gap-y-1.5 text-sm">
                            <span className="font-medium text-muted-foreground shrink-0">Name:</span>
                            <span className="min-w-0 break-words">{conversation.name || 'User'}</span>
                            <span className="font-medium text-muted-foreground shrink-0">Phone:</span>
                            <span className="min-w-0 break-all">+{conversation.phone}</span>
                            <span className="font-medium text-muted-foreground shrink-0">Message Date:</span>
                            <span className="min-w-0 break-words">{formatDateTime(conversation.message_time)}</span>
                            <span className="font-medium text-muted-foreground shrink-0">Assigned To:</span>
                            <div className="min-w-0">
                                <AssigneeCell
                                    email={conversation.assigned_to}
                                    emailToName={emailToName}
                                    currentUserEmail={user?.email}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Enquiry */}
                    <section className="space-y-3">
                        <h3 className={`font-semibold text-sm border-b-2 ${themeClasses.borderPrimary} pb-2`}>
                            Enquiry
                        </h3>
                        <div className={`bg-muted/50 p-4 rounded-lg border-l-4 ${themeClasses.borderPrimary}`}>
                            <p className="text-sm whitespace-pre-wrap">{conversation.message}</p>
                        </div>
                    </section>

                    {/* Response */}
                    {conversation.response && (
                        <section className="space-y-3">
                            <h3 className="font-semibold text-sm border-b-2 border-purple-500 pb-2">
                                Agent Response
                            </h3>
                            <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-purple-500">
                                <p className="text-sm whitespace-pre-wrap">{conversation.response}</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,6.5rem)_1fr] gap-x-3 gap-y-1.5 text-sm">
                                <span className="font-medium text-muted-foreground shrink-0">Response Time:</span>
                                <span className="min-w-0">{calculateResponseHours()}</span>
                                <span className="font-medium text-muted-foreground shrink-0">Sent At:</span>
                                <span className="min-w-0 break-words">{formatDateTime(conversation.response_time)}</span>
                            </div>
                        </section>
                    )}
                    {/* Status & Comments */}
                    <section className="space-y-3">
                        <h3 className={`font-semibold text-sm border-b-2 ${themeClasses.borderPrimary} pb-2`}>
                            Lead Status & Comments
                        </h3>
                        <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {statusOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Textarea
                            placeholder="Add comments about this lead..."
                            value={comments}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComments(e.target.value)}
                            className="min-h-[100px]"
                        />
                        {conversation.status_updated_at && (
                            <p className="text-xs text-muted-foreground break-words">
                                Last updated: {formatDateTime(conversation.status_updated_at)}
                            </p>
                        )}
                        <Button
                            onClick={handleUpdate}
                            disabled={isUpdating}
                            className={`w-full h-11 text-base font-semibold shadow-md mt-4 ${themeClasses.btnPrimary}`}
                        >
                            {isUpdating ? 'Updating...' : 'Update Status'}
                        </Button>
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    );
}

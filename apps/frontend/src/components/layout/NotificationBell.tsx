'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { useConversations } from '@/hooks/useConversations';
import { useRouter } from 'next/navigation';
import { fetchConversationDetail } from '@/lib/api';
import { DetailModal } from '@/components/modals/DetailModal';
import type { ConversationDetail } from '@/types';

export function NotificationBell() {
    const { unreadCount, markAsRead, markOneAsRead, isRead } = useNotifications();
    const { conversations, refresh } = useConversations(10); // Get latest 10
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Filter to only show unread conversations
    const unreadConversations = conversations.filter(conv => !isRead(conv.message_id, conv.message_time));

    const handleViewConversation = async (conversationId: number, messageTime: string) => {
        setOpen(false);
        // Mark this conversation as read
        markOneAsRead(conversationId, messageTime);

        try {
            const detail = await fetchConversationDetail(conversationId);
            setSelectedConversation(detail);
            setModalOpen(true);
        } catch (error) {
            console.error('Failed to fetch conversation detail:', error);
        }
    };

    const handleMarkAllRead = () => {
        markAsRead();
        setOpen(false);
    };

    const handleViewAll = () => {
        setOpen(false);
        router.push('/conversations');
    };

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground relative"
                    >
                        <Bell className="w-4 h-4" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                        <span className="sr-only">Notifications</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                    <div className="flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm">Notifications</h3>
                                {unreadCount > 0 && (
                                    <span className="flex h-5 px-2 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleMarkAllRead}
                                    className="text-xs h-auto py-1 px-2 hover:bg-emerald-50 hover:text-emerald-600"
                                >
                                    Mark all as read
                                </Button>
                            )}
                        </div>

                        {/* Notification List */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {unreadConversations.length === 0 ? (
                                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    No new notifications
                                </div>
                            ) : (
                                unreadConversations.slice(0, 10).map((conv) => (
                                    <div
                                        key={conv.message_id}
                                        className="px-4 py-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 transition-colors"
                                        onClick={() => handleViewConversation(conv.message_id, conv.message_time)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                <span className="text-emerald-600 font-semibold text-xs">
                                                    {conv.name?.charAt(0) || 'U'}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {conv.name || 'Unknown User'}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                    {conv.message.substring(0, 60)}
                                                    {conv.message.length > 60 ? '...' : ''}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {new Date(conv.message_time).toLocaleString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                            {/* Unread indicator */}
                                            <div className="flex-shrink-0">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {unreadConversations.length > 0 && (
                            <div className="px-4 py-2 border-t">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleViewAll}
                                    className="w-full text-xs hover:bg-emerald-50 hover:text-emerald-600"
                                >
                                    View all conversations
                                </Button>
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Detail Modal */}
            <DetailModal
                conversation={selectedConversation}
                open={modalOpen}
                onOpenChange={setModalOpen}
                onUpdate={refresh}
            />
        </>
    );
}

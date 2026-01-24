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
import { useRouter } from 'next/navigation';
import { fetchConversationDetail } from '@/lib/api';
import { DetailModal } from '@/components/modals/DetailModal';
import type { ConversationDetail } from '@/types';

export function NotificationBell() {
    const { unreadCount, notifications, markOneAsRead, markAsRead } = useNotifications();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const handleViewNotification = async (notification: any) => {
        setOpen(false);
        // Mark as read
        markOneAsRead(notification.id);

        if (notification.conversation_id) {
            try {
                const detail = await fetchConversationDetail(notification.conversation_id);
                setSelectedConversation(detail);
                setModalOpen(true);
            } catch (error) {
                console.error('Failed to fetch conversation detail:', error);
            }
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
                            {notifications.length === 0 ? (
                                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    No new notifications
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`px-4 py-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 transition-colors ${!notif.is_read ? 'bg-emerald-50/50' : ''}`}
                                        onClick={() => handleViewNotification(notif)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                <span className="text-emerald-600 font-semibold text-xs">
                                                    {notif.title.charAt(0)}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {notif.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                    {notif.message}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {new Date(notif.created_at).toLocaleString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                            {/* Unread indicator */}
                                            {!notif.is_read && (
                                                <div className="flex-shrink-0">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
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
            // onUpdate not strictly needed here as we aren't editing, but good practice
            />
        </>
    );
}

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { notificationApi, Notification } from '@/lib/api';

interface NotificationContextType {
    unreadCount: number;
    notifications: Notification[];
    markAsRead: () => Promise<void>;
    markOneAsRead: (notificationId: number) => Promise<void>;
    refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);



export function NotificationProvider({ children }: { children: ReactNode }) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<any[]>([]);

    const fetchNotifications = useCallback(async () => {
        try {
            const countData = await notificationApi.getUnreadCount();
            setUnreadCount(countData.unread_count);

            const notifs = await notificationApi.getNotifications(false);
            setNotifications(notifs);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }, []);

    const markAsRead = useCallback(async () => {
        try {
            await notificationApi.markAllAsRead();
            setUnreadCount(0);
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    }, [fetchNotifications]);

    const markOneAsRead = useCallback(async (notificationId: number) => {
        try {
            await notificationApi.markAsRead(notificationId);
            setUnreadCount(prev => Math.max(0, prev - 1));
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    }, [fetchNotifications]);

    const isRead = useCallback((notificationId: number) => {
        return notifications.find(n => n.id === notificationId)?.is_read || false;
    }, [notifications]);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();

        // Poll every 30 seconds for new notifications
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    return (
        <NotificationContext.Provider value={{
            unreadCount,
            notifications,
            markAsRead,
            markOneAsRead,
            refreshNotifications: fetchNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
}

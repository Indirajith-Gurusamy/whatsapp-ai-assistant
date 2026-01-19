'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { fetchConversations } from '@/lib/api';

interface NotificationContextType {
    unreadCount: number;
    markAsRead: () => void;
    markOneAsRead: (conversationId: number, messageTime: string) => void;
    isRead: (conversationId: number, messageTime: string) => boolean;
    checkForNewMessages: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'whatsapp_read_conversations';

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [isClient, setIsClient] = useState(false);
    // Track conversation ID -> latest read message timestamp
    const readConversations = useRef<Map<number, string>>(new Map());

    // Load read conversations from localStorage on mount
    useEffect(() => {
        setIsClient(true);

        // Load from localStorage
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    readConversations.current = new Map(data);
                } catch (error) {
                    console.error('Failed to load read conversations:', error);
                }
            }
        }
    }, []);

    // Save to localStorage whenever read conversations change
    const saveToStorage = useCallback(() => {
        if (typeof window !== 'undefined') {
            const data = Array.from(readConversations.current.entries());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
    }, []);

    const checkForNewMessages = useCallback(async () => {
        if (!isClient) return;

        try {
            const conversations = await fetchConversations(10);
            // Count conversations with new/unread messages
            const unreadConversations = conversations.filter(conv => {
                const lastReadTime = readConversations.current.get(conv.message_id);
                // Unread if: never read OR message time is newer than last read time
                return !lastReadTime || conv.message_time !== lastReadTime;
            });
            setUnreadCount(unreadConversations.length);
        } catch (error) {
            console.error('Failed to check for new messages:', error);
        }
    }, [isClient]);

    const markAsRead = useCallback(() => {
        setUnreadCount(0);
        // Mark all current conversations as read with their current message times
        fetchConversations(10).then(conversations => {
            conversations.forEach(conv => {
                readConversations.current.set(conv.message_id, conv.message_time);
            });
            saveToStorage();
        });
    }, [saveToStorage]);

    const markOneAsRead = useCallback((conversationId: number, messageTime: string) => {
        readConversations.current.set(conversationId, messageTime);
        setUnreadCount(prev => Math.max(0, prev - 1));
        saveToStorage();
    }, [saveToStorage]);

    const isRead = useCallback((conversationId: number, messageTime: string) => {
        const lastReadTime = readConversations.current.get(conversationId);
        // Read if we have a record AND the message time matches the last read time
        return lastReadTime === messageTime;
    }, []);

    // Poll for new messages every 1 second
    useEffect(() => {
        if (!isClient) return;

        // Initial check
        checkForNewMessages();

        const interval = setInterval(checkForNewMessages, 1000);
        return () => clearInterval(interval);
    }, [checkForNewMessages, isClient]);

    return (
        <NotificationContext.Provider value={{ unreadCount, markAsRead, markOneAsRead, isRead, checkForNewMessages }}>
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

'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseSocketOptions {
    url?: string;
    onMessage?: (data: unknown) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    autoReconnect?: boolean;
    reconnectDelay?: number;
}

export function useSocket(options: UseSocketOptions = {}) {
    const {
        url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
        onMessage,
        onConnect,
        onDisconnect,
        autoReconnect = true,
        reconnectDelay = 3000,
    } = options;

    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            const socket = new WebSocket(url);

            socket.onopen = () => {
                onConnect?.();
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onMessage?.(data);
                } catch {
                    onMessage?.(event.data);
                }
            };

            socket.onclose = () => {
                onDisconnect?.();
                if (autoReconnect) {
                    reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay);
                }
            };

            socket.onerror = () => {
                socket.close();
            };

            socketRef.current = socket;
        } catch (error) {
            console.error('WebSocket connection error:', error);
        }
    }, [url, onMessage, onConnect, onDisconnect, autoReconnect, reconnectDelay]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        socketRef.current?.close();
    }, []);

    const send = useCallback((data: unknown) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(data));
        }
    }, []);

    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        connect,
        disconnect,
        send,
        socket: socketRef.current,
    };
}

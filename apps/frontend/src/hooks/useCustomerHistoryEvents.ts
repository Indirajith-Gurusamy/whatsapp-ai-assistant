'use client';

import { useEffect } from 'react';
import { consumeCustomerEvents, SseConnectionError } from '@/lib/sse';
import { notifySessionExpired, redirectToLogin } from '@/lib/auth-storage';
import { tokenStorage } from '@/lib/api';

const BASE_RECONNECT_MS = 3000;
const MAX_RECONNECT_MS = 60_000;
const MAX_RETRIES = 12;

function isTransientSseError(err: unknown): boolean {
    if (err instanceof SseConnectionError) {
        return err.status === 502 || err.status === 503 || err.status === 504;
    }
    return err instanceof TypeError;
}

function shouldStopReconnect(err: unknown): boolean {
    if (err instanceof SseConnectionError) {
        return err.status === 401 || err.status === 403 || err.status === 404;
    }
    return false;
}

/**
 * Subscribe to server-sent events for a customer.
 * Calls `onHistoryUpdated` only when the backend signals new history data.
 */
export function useCustomerHistoryEvents(
    customerUuid: string | null,
    enabled: boolean,
    onHistoryUpdated: () => void,
) {
    useEffect(() => {
        if (!customerUuid || !enabled) return;

        const abortController = new AbortController();
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let cancelled = false;
        let retryCount = 0;

        const scheduleReconnect = () => {
            if (cancelled || abortController.signal.aborted || retryCount >= MAX_RETRIES) return;
            const delay = Math.min(BASE_RECONNECT_MS * 2 ** retryCount, MAX_RECONNECT_MS);
            retryCount += 1;
            reconnectTimer = setTimeout(connect, delay);
        };

        const connect = async () => {
            try {
                await consumeCustomerEvents(
                    customerUuid,
                    (event) => {
                        if (event.type === 'history_updated') {
                            onHistoryUpdated();
                        }
                    },
                    abortController.signal,
                );
                if (!cancelled && !abortController.signal.aborted) {
                    scheduleReconnect();
                }
            } catch (err) {
                if (err instanceof SseConnectionError && err.status === 401) {
                    tokenStorage.clearTokens();
                    notifySessionExpired();
                    redirectToLogin();
                    return;
                }
                if (shouldStopReconnect(err)) {
                    return;
                }
                if (!cancelled && !abortController.signal.aborted && isTransientSseError(err)) {
                    scheduleReconnect();
                }
            }
        };

        connect();

        return () => {
            cancelled = true;
            abortController.abort();
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
    }, [customerUuid, enabled, onHistoryUpdated]);
}

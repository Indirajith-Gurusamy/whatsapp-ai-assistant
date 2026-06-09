import { tokenStorage } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type CustomerHistoryEvent = {
    type: 'history_updated' | 'heartbeat';
};

export class SseConnectionError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'SseConnectionError';
        this.status = status;
    }
}

function parseSseChunk(chunk: string): string | null {
    const dataLine = chunk
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.startsWith('data: '));
    return dataLine ? dataLine.slice(6) : null;
}

/** Read an authenticated SSE stream until aborted or the connection closes. */
export async function consumeCustomerEvents(
    customerUuid: string,
    onEvent: (event: CustomerHistoryEvent) => void,
    signal: AbortSignal,
): Promise<void> {
    const token = tokenStorage.getAccessToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    const response = await fetch(
        `${API_BASE_URL}/api/customers/by-uuid/${customerUuid}/events`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'text/event-stream',
            },
            signal,
        },
    );

    if (!response.ok) {
        throw new SseConnectionError(
            `SSE connection failed (${response.status})`,
            response.status,
        );
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('SSE stream unavailable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
            if (!part.trim() || part.trim().startsWith(':')) continue;
            const payload = parseSseChunk(part);
            if (!payload) continue;
            try {
                onEvent(JSON.parse(payload) as CustomerHistoryEvent);
            } catch {
                /* ignore malformed events */
            }
        }
    }
}

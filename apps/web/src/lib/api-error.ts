import { tokenStorage } from '@/lib/token-storage';
import { toast } from 'sonner';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
    status: number;
    code: string;
    details: unknown;

    constructor(message: string, status: number, code: string, details?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

function getStatusMessage(status: number): string {
    if (status === 401) return 'Your session has expired. Please log in again.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 404) return 'The requested resource was not found.';
    if (status === 429) return 'Too many requests. Please try again later.';
    if (status >= 500) return 'A server error occurred. Please try again later.';
    return 'An unexpected error occurred.';
}

export async function apiFetch<T = any>(
    url: string,
    options?: RequestInit & { showToast?: boolean }
): Promise<T> {
    const { showToast = true, ...fetchOptions } = options || {};

    const token = tokenStorage.getAccessToken();
    const headers = new Headers(fetchOptions.headers);

    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    let response: Response;

    try {
        response = await fetch(url, { ...fetchOptions, headers });
    } catch (error) {
        const message = error instanceof TypeError
            ? 'Unable to connect to server. Please check your connection.'
            : 'An unexpected network error occurred.';

        if (showToast) {
            toast.error(message);
        }

        throw new ApiError(message, 0, 'NETWORK_ERROR', error);
    }

    if (!response.ok) {
        // No token and got 401/403 → user is not logged in. Redirect silently.
        if ((response.status === 401 || response.status === 403) && !token) {
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
            throw new ApiError('Not authenticated', response.status, 'UNAUTHENTICATED');
        }

        // Auto-logout on 401 only when the user had a token (was authenticated).
        // Skip for unauthenticated endpoints (login/signup) where 401 = wrong credentials.
        if (response.status === 401 && token) {
            tokenStorage.clearTokens();
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
            throw new ApiError('Session expired. Please log in again.', 401, 'UNAUTHORIZED');
        }

        let body: any = null;
        try {
            body = await response.json();
        } catch {
            // response body is not JSON
        }

        const serverMessage = body?.detail || body?.message;
        const message = serverMessage || getStatusMessage(response.status);
        const code = body?.code || `HTTP_${response.status}`;

        if (showToast) {
            toast.error(message);
        }

        throw new ApiError(message, response.status, code, body);
    }

    return response.json() as Promise<T>;
}

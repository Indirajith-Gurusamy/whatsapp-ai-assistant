/**
 * Parse API datetime strings as UTC and format for the user's local timezone.
 * Backend sends ISO-8601 UTC with a trailing Z (or legacy strings without offset).
 */

export function parseAppDate(dateString: string | null | undefined): Date | null {
    if (!dateString) return null;
    const text = String(dateString).trim();
    if (!text) return null;

    const hasOffset = /[zZ]$|[+-]\d{2}:\d{2}$/.test(text);
    const normalized = hasOffset ? text : `${text}Z`;

    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** Full date + time in the user's locale/timezone. */
export function formatDateTime(dateString: string | null | undefined): string {
    const date = parseAppDate(dateString);
    if (!date) return dateString ? String(dateString) : '-';
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/** Date and time parts for table columns. */
export function formatDateParts(dateString: string | null | undefined): {
    date: string;
    time: string;
} {
    const date = parseAppDate(dateString);
    if (!date) return { date: '-', time: '' };
    return {
        date: date.toLocaleDateString(undefined, {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
        }),
        time: date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
        }),
    };
}

/** Time only in the user's locale/timezone. */
export function formatTime(dateString: string | null | undefined): string {
    const date = parseAppDate(dateString);
    if (!date) return dateString ? String(dateString) : '';
    return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    });
}

/** Relative date label for chat dividers (Today, Yesterday, etc.). */
export function formatDateDivider(dateString: string | null | undefined): string {
    const date = parseAppDate(dateString);
    if (!date) return dateString ? String(dateString) : '';

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    if (sameDay(date, today)) return 'Today';
    if (sameDay(date, yesterday)) return 'Yesterday';

    return date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
}

/** Long format for detail views. */
export function formatDateTimeLong(dateString: string | null | undefined): string {
    const date = parseAppDate(dateString);
    if (!date) return dateString ? String(dateString) : '-';
    return date.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/** Compact inbox list date (Gmail-style). */
export function formatInboxDate(dateString: string | null | undefined): string {
    const date = parseAppDate(dateString);
    if (!date) return dateString ? String(dateString) : '';

    const now = new Date();
    const sameDay =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    if (sameDay) {
        return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
}

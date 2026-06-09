'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Mail, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConversationHistory } from '@/types';
import { Button } from '@/components/ui/button';
import { EmailMessageBody } from '@/components/email/EmailMessageBody';
import { parseEmailContent } from '@/lib/email-content';
import { formatDateTimeLong, formatInboxDate, parseAppDate } from '@/lib/date';
import { markEmailAsRead } from '@/lib/api';

interface ParsedEmail {
    id: string;
    subject: string;
    body: string;
    htmlBody?: string | null;
    timestamp: string;
    fromName: string;
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name.trim()[0] || '?').toUpperCase();
}

interface EmailInboxViewProps {
    customerName: string;
    customerEmail: string;
    history: ConversationHistory[];
    isLoading: boolean;
    onBack?: () => void;
}

export function EmailInboxView({
    customerName,
    customerEmail,
    history,
    isLoading,
    onBack,
}: EmailInboxViewProps) {
    const emails = useMemo<ParsedEmail[]>(() => {
        return history
            .filter((m) => m.role === 'customer')
            .map((m, index) => {
                const { subject, body } = parseEmailContent(m.content);
                return {
                    id: String(m.id ?? `${m.timestamp}-${index}`),
                    subject,
                    body,
                    htmlBody: m.html_body,
                    timestamp: m.timestamp,
                    fromName: m.name || customerName,
                };
            })
            .sort((a, b) => {
                const idA = Number(a.id);
                const idB = Number(b.id);
                if (Number.isFinite(idA) && Number.isFinite(idB) && idA !== idB) {
                    return idB - idA;
                }
                return (
                    (parseAppDate(b.timestamp)?.getTime() ?? 0) -
                    (parseAppDate(a.timestamp)?.getTime() ?? 0)
                );
            });
    }, [history, customerName]);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const markedReadRef = useRef<Set<number>>(new Set());

    const activeEmail = selectedId ? emails.find((e) => e.id === selectedId) ?? null : null;

    useEffect(() => {
        if (!selectedId) return;
        const messageId = Number(selectedId);
        if (!Number.isFinite(messageId) || markedReadRef.current.has(messageId)) return;
        markedReadRef.current.add(messageId);
        markEmailAsRead(messageId).catch(() => {
            markedReadRef.current.delete(messageId);
        });
    }, [selectedId]);

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col min-h-0 bg-[#f6f8fc]">
            {/* Header */}
            <div className="flex-none flex items-center gap-3 border-b border-gray-200 bg-white px-3 py-2.5 shadow-sm">
                {onBack && (
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {getInitials(customerName)}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{customerName}</p>
                    <p className="truncate text-xs text-gray-500">{customerEmail}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Inbox className="h-4 w-4" />
                    <span>{emails.length}</span>
                </div>
            </div>

            <div className="flex flex-1 min-h-0 flex-col md:flex-row">
                {/* Inbox list */}
                <div
                    className={cn(
                        'flex flex-col border-gray-200 bg-white md:w-[340px] md:shrink-0 md:border-r',
                        activeEmail && 'hidden md:flex'
                    )}
                >
                    <div className="border-b border-gray-100 px-4 py-2.5">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Inbox
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {emails.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-muted-foreground">
                                <Mail className="h-10 w-10 opacity-40" />
                                <p className="text-sm">No emails from this contact yet</p>
                            </div>
                        ) : (
                            emails.map((email) => {
                                const isActive = activeEmail?.id === email.id;
                                const preview = email.body.replace(/\s+/g, ' ').slice(0, 120);
                                return (
                                    <button
                                        key={email.id}
                                        type="button"
                                        onClick={() => setSelectedId(email.id)}
                                        className={cn(
                                            'w-full border-b border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50',
                                            isActive && 'bg-blue-50 hover:bg-blue-50 border-l-2 border-l-blue-600'
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="truncate text-sm font-semibold text-gray-900">
                                                {email.subject}
                                            </p>
                                            <span className="shrink-0 text-[11px] text-gray-500">
                                                {formatInboxDate(email.timestamp)}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 truncate text-xs text-gray-500">
                                            {email.fromName}
                                        </p>
                                        <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                                            {preview}
                                        </p>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Reading pane */}
                <div className={cn('flex flex-1 flex-col min-h-0 bg-white', !activeEmail && 'hidden md:flex')}>
                    {activeEmail ? (
                        <>
                            <div className="flex-none border-b border-gray-200 px-4 py-3 md:px-6">
                                <div className="flex items-start gap-2 md:hidden">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="-ml-2 h-8 px-2"
                                        onClick={() => setSelectedId(null)}
                                    >
                                        <ArrowLeft className="h-4 w-4 mr-1" />
                                        Inbox
                                    </Button>
                                </div>
                                <h1 className="text-lg font-normal text-gray-900 leading-snug">
                                    {activeEmail.subject}
                                </h1>
                                <div className="mt-3 flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                                        {getInitials(activeEmail.fromName)}
                                    </div>
                                    <div className="min-w-0 flex-1 text-sm">
                                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                            <span className="font-medium text-gray-900">
                                                {activeEmail.fromName}
                                            </span>
                                            <span className="text-gray-500">&lt;{customerEmail}&gt;</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {formatDateTimeLong(activeEmail.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6">
                                <EmailMessageBody
                                    body={activeEmail.body}
                                    htmlBody={activeEmail.htmlBody}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Mail className="h-12 w-12 opacity-30" />
                            <p className="text-sm">Select an email to read</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

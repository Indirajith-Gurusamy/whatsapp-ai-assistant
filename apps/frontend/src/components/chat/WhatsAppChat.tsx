'use client';

import { useMemo, useRef, useEffect, useCallback } from 'react';
import {
    ArrowLeft,
    Bot,
    MoreVertical,
    Paperclip,
    Send,
    Smile,
    UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConversationHistory } from '@/types';
import { MessageBubble, DateDivider, formatDateDivider } from './MessageBubble';
import type { MessageDeliveryStatus } from '@/types';
import { Button } from '@/components/ui/button';

interface WhatsAppChatProps {
    customerName: string;
    customerPhone: string;
    history: ConversationHistory[];
    isLoading: boolean;
    aiEnabled: boolean;
    isTogglingAI: boolean;
    conversationUuid: string | null;
    onToggleAI: () => void;
    agentMessage: string;
    onAgentMessageChange: (value: string) => void;
    onSendMessage: () => void;
    isSending: boolean;
    pendingMessages?: ConversationHistory[];
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onBack?: () => void;
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.trim()[0] || '?').toUpperCase();
}

function groupHistoryByDate(history: ConversationHistory[]) {
    const groups: { dateLabel: string; messages: ConversationHistory[] }[] = [];
    let currentLabel = '';

    for (const item of history) {
        const label = formatDateDivider(item.timestamp);
        if (label !== currentLabel) {
            currentLabel = label;
            groups.push({ dateLabel: label, messages: [] });
        }
        groups[groups.length - 1].messages.push(item);
    }
    return groups;
}

export function WhatsAppChat({
    customerName,
    customerPhone,
    history,
    isLoading,
    aiEnabled,
    isTogglingAI,
    conversationUuid,
    onToggleAI,
    agentMessage,
    onAgentMessageChange,
    onSendMessage,
    isSending,
    pendingMessages = [],
    onKeyDown,
    onBack,
}: WhatsAppChatProps) {
    const messagesScrollRef = useRef<HTMLDivElement>(null);
    const displayHistory = useMemo(
        () => [...history, ...pendingMessages],
        [history, pendingMessages]
    );
    const grouped = useMemo(() => groupHistoryByDate(displayHistory), [displayHistory]);

    const scrollToBottom = useCallback((smooth = true) => {
        const el = messagesScrollRef.current;
        if (!el) return;
        el.scrollTo({
            top: el.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto',
        });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [displayHistory, isSending, scrollToBottom]);

    const displayPhone = customerPhone.startsWith('+') ? customerPhone : `+${customerPhone}`;

    return (
        <div className="flex flex-col h-full min-h-0 w-full max-w-none flex-1 overflow-hidden bg-[#f0f2f5]">
            {/* Header */}
            <header className="flex-none flex items-center gap-3 px-3 py-2.5 bg-[#008069] text-white shrink-0 z-10">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="p-1.5 -ml-1 rounded-full hover:bg-white/10 transition-colors lg:hidden"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <div className="w-10 h-10 rounded-full bg-[#dfe5e7] text-[#54656f] flex items-center justify-center font-semibold text-sm shrink-0">
                    {getInitials(customerName || 'User')}
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="font-medium text-[16px] leading-tight truncate text-white">
                        {customerName || 'User'}
                    </h2>
                    <p className="text-xs text-white/70 truncate">{displayPhone}</p>
                </div>
                <button
                    type="button"
                    onClick={onToggleAI}
                    disabled={isTogglingAI || !conversationUuid}
                    className={cn(
                        'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors shrink-0 text-white',
                        aiEnabled
                            ? 'bg-white/15 hover:bg-white/25'
                            : 'bg-[#00a884] hover:bg-[#06cf9c] ring-1 ring-white/30'
                    )}
                    title={aiEnabled ? 'AI is replying automatically' : 'You are replying manually'}
                >
                    {aiEnabled ? (
                        <>
                            <Bot className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">AI on</span>
                        </>
                    ) : (
                        <>
                            <UserRound className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Manual</span>
                        </>
                    )}
                </button>
                <button
                    type="button"
                    className="p-2 rounded-full hover:bg-white/10 text-white/90 hidden sm:flex shrink-0"
                    aria-label="More options"
                >
                    <MoreVertical className="w-5 h-5" />
                </button>
            </header>

            {/* Scrollable messages — only this region scrolls */}
            <div
                ref={messagesScrollRef}
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden wa-chat-bg overscroll-contain"
            >
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3">
                        <div className="w-10 h-10 rounded-full border-2 border-[#00a884]/30 border-t-[#00a884] animate-spin" />
                        <p className="text-sm text-[#667781]">Loading messages…</p>
                    </div>
                ) : displayHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-8">
                        <div className="w-16 h-16 rounded-full bg-[#00a884]/10 flex items-center justify-center mb-4">
                            <Send className="w-7 h-7 text-[#00a884]" />
                        </div>
                        <p className="text-[#111b21] font-medium mb-1">No messages yet</p>
                        <p className="text-sm text-[#667781] max-w-xs">
                            When this customer messages your WhatsApp number, the conversation will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="py-2 pb-3">
                        {grouped.map((group) => (
                            <div key={group.dateLabel}>
                                <DateDivider label={group.dateLabel} />
                                <div className="flex flex-col gap-0.5">
                                    {group.messages.map((item, index) => (
                                        <MessageBubble
                                            key={
                                                item.id
                                                    ? `msg-${item.id}`
                                                    : `${group.dateLabel}-${index}-${item.timestamp}-pending`
                                            }
                                            content={item.content}
                                            name={item.name}
                                            timestamp={item.timestamp}
                                            role={item.role}
                                            status={item.status as MessageDeliveryStatus | undefined}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="flex-none bg-[#f0f2f5] px-3 py-2 pb-3 shrink-0 border-t border-[#d1d7db]/80">
                {!aiEnabled ? (
                    <div className="flex items-end gap-2">
                        <button
                            type="button"
                            className="p-2 text-[#54656f] shrink-0 hidden sm:block"
                            aria-hidden
                        >
                            <Smile className="w-6 h-6" />
                        </button>
                        <button
                            type="button"
                            className="p-2 text-[#54656f] shrink-0 hidden sm:block"
                            aria-hidden
                        >
                            <Paperclip className="w-6 h-6" />
                        </button>
                        <div className="flex-1 flex items-end bg-white rounded-lg shadow-sm min-h-[42px] px-3 py-2">
                            <textarea
                                value={agentMessage}
                                onChange={(e) => onAgentMessageChange(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder="Type a message"
                                rows={1}
                                className="flex-1 resize-none bg-transparent text-[15px] text-[#111b21] placeholder:text-[#667781] outline-none max-h-[120px] leading-[20px] w-full"
                            />
                        </div>
                        <Button
                            type="button"
                            onClick={onSendMessage}
                            disabled={isSending || !agentMessage.trim()}
                            size="icon"
                            className="shrink-0 h-[42px] w-[42px] rounded-full bg-[#00a884] hover:bg-[#06cf9c] text-white shadow-sm disabled:opacity-50"
                        >
                            <Send className="w-5 h-5" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-2 py-2 px-3 bg-white/90 rounded-lg border border-[#e9edef]">
                        <Bot className="w-4 h-4 text-[#00a884] shrink-0" />
                        <p className="text-xs text-[#667781] text-center leading-snug">
                            AI is handling replies. Tap{' '}
                            <button
                                type="button"
                                onClick={onToggleAI}
                                className="font-semibold text-[#008069] hover:underline"
                            >
                                AI on
                            </button>{' '}
                            in the header to reply manually.
                        </p>
                    </div>
                )}
            </footer>
        </div>
    );
}

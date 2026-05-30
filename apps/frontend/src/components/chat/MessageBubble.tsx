import { cn } from '@/lib/utils';
import { Check, CheckCheck, Clock } from 'lucide-react';

function formatMessageTime(timestamp: string): string {
    if (!timestamp) return '';
    try {
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return timestamp;
        return date.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
        });
    } catch {
        return timestamp;
    }
}

export type MessageBubbleRole = 'customer' | 'agent' | 'human_agent';
export type MessageDeliveryStatus =
    | 'received'
    | 'sent'
    | 'delivered'
    | 'read'
    | 'failed'
    | 'sending'
    | 'pending';

interface MessageBubbleProps {
    content: string;
    name: string;
    timestamp: string;
    role: MessageBubbleRole;
    status?: MessageDeliveryStatus;
    className?: string;
}

/** Customer = left (white). Business / AI / agent = right (green). */
function isOutgoingMessage(role: string, name: string): boolean {
    if (role === 'customer') return false;
    if (role === 'human_agent' || name === 'Human Agent') return true;
    if (role === 'agent' || name === 'AI Assistant') return true;
    return false;
}

function MessageTicks({ status }: { status?: MessageDeliveryStatus }) {
    const tickClass = 'w-[14px] h-[14px] stroke-[2.5]';

    if (status === 'sending' || status === 'pending') {
        return (
            <span className="text-[#8696a0] ml-0.5" aria-label="Sending">
                <Clock className={tickClass} />
            </span>
        );
    }

    if (status === 'failed') {
        return (
            <span className="text-[#ea0038] text-[11px] font-medium ml-0.5" aria-label="Failed to send">
                !
            </span>
        );
    }

    if (status === 'read') {
        return (
            <span className="text-[#53bdeb] ml-0.5" aria-label="Read">
                <CheckCheck className={tickClass} />
            </span>
        );
    }

    if (status === 'delivered') {
        return (
            <span className="text-[#8696a0] ml-0.5" aria-label="Delivered">
                <CheckCheck className={tickClass} />
            </span>
        );
    }

    return (
        <span className="text-[#8696a0] ml-0.5" aria-label="Sent">
            <Check className={tickClass} />
        </span>
    );
}

export function MessageBubble({
    content,
    name,
    timestamp,
    role,
    status,
    className,
}: MessageBubbleProps) {
    const isOutgoing = isOutgoingMessage(role, name);
    const isHumanAgent = role === 'human_agent' || name === 'Human Agent';

    const senderLabel = isOutgoing
        ? isHumanAgent
            ? 'You'
            : 'AI'
        : null;

    const outboundStatus = isOutgoing
        ? (status as MessageDeliveryStatus) || 'sent'
        : undefined;

    return (
        <div
            className={cn(
                'flex w-full min-w-0 px-2 sm:px-3',
                isOutgoing ? 'justify-end' : 'justify-start',
                className
            )}
        >
            <div
                className={cn(
                    'relative max-w-[min(82%,280px)] sm:max-w-[min(75%,360px)] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]',
                    isOutgoing
                        ? 'bg-[#d9fdd3] rounded-lg rounded-tr-none'
                        : 'bg-white rounded-lg rounded-tl-none'
                )}
            >
                {senderLabel && (
                    <span
                        className={cn(
                            'block text-[11px] font-semibold px-2.5 pt-1.5 leading-none',
                            isHumanAgent ? 'text-[#027eb5]' : 'text-[#25d366]'
                        )}
                    >
                        {senderLabel}
                    </span>
                )}
                <div className={cn('px-2.5 pb-1.5', senderLabel ? 'pt-0.5' : 'pt-1.5')}>
                    <p className="text-[14.2px] leading-[19px] text-[#111b21] whitespace-pre-wrap break-words">
                        {content}
                    </p>
                    <div className="flex items-center justify-end gap-0.5 mt-0.5 float-right ml-4 clear-both">
                        <span className="text-[11px] text-[#667781] leading-none tabular-nums">
                            {formatMessageTime(timestamp)}
                        </span>
                        {isOutgoing && <MessageTicks status={outboundStatus} />}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function formatDateDivider(timestamp: string): string {
    try {
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return 'Earlier';
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
        });
    } catch {
        return 'Earlier';
    }
}

export function DateDivider({ label }: { label: string }) {
    return (
        <div className="flex justify-center my-2 px-4">
            <span className="bg-[#ffffffd9] text-[#54656f] text-xs font-medium px-3 py-1 rounded-lg shadow-sm">
                {label}
            </span>
        </div>
    );
}

import { cn } from '@/lib/utils';

interface MessageBubbleProps {
    content: string;
    name: string;
    timestamp: string;
    role: 'customer' | 'agent';
    className?: string;
}

export function MessageBubble({
    content,
    name,
    timestamp,
    role,
    className,
}: MessageBubbleProps) {
    const isCustomer = role === 'customer';
    // Show customer name for customer messages, "AI Assistant" for agent responses
    const displayName = isCustomer ? name : 'AI Assistant';

    return (
        <div
            className={cn(
                "flex flex-col max-w-[85%] md:max-w-[70%]",
                isCustomer ? "items-start" : "items-end ml-auto",
                className
            )}
        >
            <span className={cn(
                "text-xs font-medium mb-1 px-1",
                isCustomer ? "text-muted-foreground" : "text-emerald-600"
            )}>
                {displayName}
            </span>
            <div
                className={cn(
                    "rounded-2xl px-4 py-3 shadow-sm",
                    isCustomer
                        ? "bg-muted rounded-tl-sm"
                        : "bg-emerald-500 text-white rounded-tr-sm"
                )}
            >
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {content}
                </p>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 px-1">
                {timestamp}
            </span>
        </div>
    );
}


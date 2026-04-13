import { cn } from '@/lib/utils';
import { themeClasses } from '@/lib/theme';

interface MessageBubbleProps {
    content: string;
    name: string;
    timestamp: string;
    role: 'customer' | 'agent' | 'human_agent';
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
    const isHumanAgent = name === 'Human Agent';
    const displayName = isCustomer ? name : (isHumanAgent ? '👤 Human Agent' : '🤖 AI Assistant');

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
                isCustomer
                    ? "text-muted-foreground"
                    : isHumanAgent
                        ? "text-blue-500"
                        : themeClasses.textPrimary
            )}>
                {displayName}
            </span>
            <div
                className={cn(
                    "rounded-2xl px-4 py-3 shadow-sm",
                    isCustomer
                        ? "bg-muted rounded-tl-sm"
                        : isHumanAgent
                            ? "bg-blue-500 text-white rounded-tr-sm"
                            : `${themeClasses.bgPrimary} text-white rounded-tr-sm`
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

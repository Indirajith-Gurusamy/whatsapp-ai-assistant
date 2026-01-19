import type { Conversation } from '@/types';
import { StatusBadge } from '@/components/data/StatusBadge';
import { cn } from '@/lib/utils';

interface ChatListProps {
    conversations: Conversation[];
    onSelect?: (conversation: Conversation) => void;
    selectedId?: number;
    className?: string;
}

export function ChatList({
    conversations,
    onSelect,
    selectedId,
    className,
}: ChatListProps) {
    if (conversations.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
                No conversations found
            </div>
        );
    }

    return (
        <div className={cn("divide-y divide-border", className)}>
            {conversations.map((conversation) => (
                <div
                    key={conversation.message_id}
                    onClick={() => onSelect?.(conversation)}
                    className={cn(
                        "flex flex-col gap-2 p-4 cursor-pointer transition-colors hover:bg-accent/50",
                        selectedId === conversation.message_id && "bg-accent"
                    )}
                >
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-semibold text-emerald-600">
                                    {(conversation.name || 'U')[0].toUpperCase()}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                    {conversation.name || 'User'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    +{conversation.phone}
                                </p>
                            </div>
                        </div>
                        <StatusBadge status={conversation.lead_status} />
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 pl-10">
                        {conversation.message}
                    </p>

                    <div className="flex items-center justify-between pl-10">
                        <span className="text-xs text-muted-foreground">
                            {conversation.message_time}
                        </span>
                        {conversation.response && (
                            <span className="text-xs text-emerald-600 font-medium">
                                Replied
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

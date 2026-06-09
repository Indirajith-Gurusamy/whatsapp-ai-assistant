import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ChannelType = 'whatsapp' | 'email' | string | null | undefined;

const channelStyles: Record<string, string> = {
    email: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    whatsapp:
        'bg-[#d9fdd3] text-[#008069] border-[#b8e8b0] dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
};

const channelLabels: Record<string, string> = {
    email: 'Email',
    whatsapp: 'WhatsApp',
};

interface ChannelBadgeProps {
    channel: ChannelType;
    className?: string;
}

export function ChannelBadge({ channel, className }: ChannelBadgeProps) {
    const key = (channel || 'whatsapp').toLowerCase();
    const label = channelLabels[key] ?? key;
    const style =
        channelStyles[key] ??
        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400';

    return (
        <Badge
            variant="outline"
            title={label}
            className={cn(
                'font-medium text-xs uppercase tracking-wide border',
                style,
                className
            )}
        >
            {label}
        </Badge>
    );
}

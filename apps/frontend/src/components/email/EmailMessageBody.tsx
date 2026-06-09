'use client';

import { cn } from '@/lib/utils';
import { parseEmailBodyLines, type EmailBodySegment } from '@/lib/email-content';
import { EmailHtmlView } from '@/components/email/EmailHtmlView';

function truncateLinkLabel(label: string, max = 80): string {
    if (label.length <= max) return label;
    return `${label.slice(0, max)}…`;
}

function Segment({ segment }: { segment: EmailBodySegment }) {
    if (segment.type === 'link') {
        return (
            <a
                href={segment.href}
                target="_blank"
                rel="noopener noreferrer"
                title={segment.href}
                className="text-blue-600 underline underline-offset-2 break-all hover:text-blue-800 dark:text-blue-400"
            >
                {truncateLinkLabel(segment.label)}
            </a>
        );
    }
    return <span className="break-words [overflow-wrap:anywhere]">{segment.value}</span>;
}

interface EmailMessageBodyProps {
    body: string;
    htmlBody?: string | null;
    className?: string;
}

export function EmailMessageBody({ body, htmlBody, className }: EmailMessageBodyProps) {
    if (htmlBody) {
        return <EmailHtmlView html={htmlBody} className={className} />;
    }

    const lines = parseEmailBodyLines(body);

    return (
        <div
            className={cn(
                'text-sm leading-relaxed text-foreground',
                'break-words [overflow-wrap:anywhere] overflow-x-hidden',
                className
            )}
        >
            {lines.map((line, index) => {
                if (line.kind === 'blank') {
                    return <div key={index} className="h-3" aria-hidden />;
                }
                if (line.kind === 'table') {
                    return (
                        <p
                            key={index}
                            className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground break-words [overflow-wrap:anywhere]"
                        >
                            {line.text}
                        </p>
                    );
                }
                return (
                    <p key={index} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                        {line.segments.map((segment, i) => (
                            <Segment key={i} segment={segment} />
                        ))}
                    </p>
                );
            })}
        </div>
    );
}

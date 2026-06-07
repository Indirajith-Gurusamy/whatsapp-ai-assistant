'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { themeClasses } from '@/lib/theme';
import { AnimatedNumber } from './AnimatedNumber';

interface AnalyticsCardProps {
    title: string;
    value: string | number;
    icon?: LucideIcon;
    description?: string;
    className?: string;
    onClick?: () => void;
    index?: number;
    animate?: boolean;
}

export function AnalyticsCard({
    title,
    value,
    icon: Icon,
    description,
    className,
    onClick,
    index = 0,
    animate = true,
}: AnalyticsCardProps) {
    const isNumeric = typeof value === 'number';

    return (
        <Card
            className={cn(
                'group gap-2 py-3 px-3 sm:gap-4 sm:py-4 sm:px-4',
                'transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-orange-200 dark:hover:border-orange-800/50',
                animate && 'animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both',
                onClick && 'cursor-pointer',
                className,
            )}
            style={animate ? { animationDelay: `${index * 60}ms` } : undefined}
            onClick={onClick}
        >
            <CardHeader className="relative space-y-0 p-0 pb-1">
                <CardTitle
                    title={title}
                    className={cn(
                        'pr-9 sm:pr-10',
                        'text-[11px] sm:text-xs font-semibold text-muted-foreground',
                        'leading-snug break-words [overflow-wrap:anywhere]',
                        'normal-case sm:uppercase tracking-normal sm:tracking-wide',
                    )}
                >
                    {title}
                </CardTitle>
                {Icon && (
                    <div
                        className={cn(
                            'absolute right-0 top-0 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg',
                            'transition-transform duration-300 group-hover:scale-110',
                            themeClasses.bgPrimaryLight,
                            'dark:bg-orange-950/40',
                        )}
                    >
                        <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', themeClasses.iconPrimary, 'dark:text-orange-400')} />
                    </div>
                )}
            </CardHeader>
            <CardContent className="p-0">
                <div className={cn('text-xl sm:text-2xl md:text-3xl font-bold', themeClasses.textPrimary, 'dark:text-orange-400')}>
                    {isNumeric ? (
                        <AnimatedNumber value={value} />
                    ) : (
                        value
                    )}
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

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
                'group transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-orange-200 dark:hover:border-orange-800/50',
                animate && 'animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both',
                onClick && 'cursor-pointer',
                className
            )}
            style={animate ? { animationDelay: `${index * 60}ms` } : undefined}
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {title}
                </CardTitle>
                {Icon && (
                    <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110',
                        themeClasses.bgPrimaryLight,
                        'dark:bg-orange-950/40'
                    )}>
                        <Icon className={cn('h-4 w-4', themeClasses.iconPrimary, 'dark:text-orange-400')} />
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div className={cn('text-2xl md:text-3xl font-bold', themeClasses.textPrimary, 'dark:text-orange-400')}>
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

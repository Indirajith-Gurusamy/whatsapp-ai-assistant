import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { themeClasses } from '@/lib/theme';

interface AnalyticsCardProps {
    title: string;
    value: string | number;
    icon?: LucideIcon;
    description?: string;
    className?: string;
    onClick?: () => void;
}

export function AnalyticsCard({
    title,
    value,
    icon: Icon,
    description,
    className,
    onClick,
}: AnalyticsCardProps) {
    return (
        <Card
            className={cn(
                "transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
                onClick && "cursor-pointer",
                className
            )}
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {title}
                </CardTitle>
                {Icon && (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                )}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl md:text-3xl font-bold ${themeClasses.textPrimary} dark:${themeClasses.textPrimaryLight}`}>
                    {value}
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

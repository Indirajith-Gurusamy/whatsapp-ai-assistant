'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { themeClasses } from '@/lib/theme';

interface SuccessRateRingProps {
    rate: number;
    responseTime: string;
}

export function SuccessRateRing({ rate, responseTime }: SuccessRateRingProps) {
    const cappedRate = Math.min(100, Math.max(0, rate));
    const [animatedRate, setAnimatedRate] = useState(0);
    const radius = 72;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (animatedRate / 100) * circumference;

    useEffect(() => {
        const timeout = setTimeout(() => setAnimatedRate(cappedRate), 150);
        return () => clearTimeout(timeout);
    }, [cappedRate]);

    return (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both [animation-delay:200ms]">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Performance</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-4 pb-6">
                <div className="relative flex items-center justify-center">
                    <svg width="180" height="180" className="-rotate-90">
                        <circle
                            cx="90"
                            cy="90"
                            r={radius}
                            fill="none"
                            stroke="var(--muted)"
                            strokeWidth="12"
                        />
                        <circle
                            cx="90"
                            cy="90"
                            r={radius}
                            fill="none"
                            stroke="var(--chart-1)"
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            className="transition-[stroke-dashoffset] duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-3xl font-bold ${themeClasses.textPrimary}`}>
                            {animatedRate.toFixed(animatedRate % 1 === 0 ? 0 : 1)}%
                        </span>
                        <span className="text-xs text-muted-foreground">Success Rate</span>
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Avg Response Time</p>
                    <p className={`text-lg font-semibold ${themeClasses.textPrimary}`}>{responseTime}</p>
                </div>
            </CardContent>
        </Card>
    );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { Analytics } from '@/types';

interface MetricsBarChartProps {
    analytics: Analytics;
}

export function MetricsBarChart({ analytics }: MetricsBarChartProps) {
    const chartData = [
        { name: 'Messages', value: analytics.total_messages },
        { name: 'Responses', value: analytics.total_responses },
        { name: 'Users', value: analytics.unique_users },
        { name: 'Today', value: analytics.messages_today },
    ];

    return (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both [animation-delay:100ms]">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Activity Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
                            contentStyle={{
                                backgroundColor: 'var(--card)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                fontSize: '12px',
                            }}
                        />
                        <Bar
                            dataKey="value"
                            fill="var(--chart-1)"
                            radius={[6, 6, 0, 0]}
                            animationDuration={900}
                            animationEasing="ease-out"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

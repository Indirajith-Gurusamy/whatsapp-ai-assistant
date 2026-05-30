'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import { LEAD_STATUS_CHART_COLORS } from './chart-colors';

interface LeadStatusChartProps {
    data: {
        newLead: number;
        appSent: number;
        appIn: number;
        onHold: number;
        lost: number;
    };
}

export function LeadStatusChart({ data }: LeadStatusChartProps) {
    const chartData = [
        { name: 'New Leads', value: data.newLead },
        { name: 'Application Sent', value: data.appSent },
        { name: 'Application In', value: data.appIn },
        { name: 'On Hold', value: data.onHold },
        { name: 'Lost', value: data.lost },
    ].filter((item) => item.value > 0);

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
        return (
            <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Lead Pipeline</CardTitle>
                </CardHeader>
                <CardContent className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                    No conversation data yet
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Lead Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={95}
                            paddingAngle={3}
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={900}
                            animationEasing="ease-out"
                        >
                            {chartData.map((entry) => (
                                <Cell
                                    key={entry.name}
                                    fill={LEAD_STATUS_CHART_COLORS[entry.name]}
                                    stroke="transparent"
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--card)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                fontSize: '12px',
                            }}
                            formatter={(value, name) => {
                                const num = typeof value === 'number' ? value : Number(value ?? 0);
                                return [
                                    `${num} (${Math.round((num / total) * 100)}%)`,
                                    String(name ?? ''),
                                ];
                            }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            formatter={(value: string) => (
                                <span className="text-xs text-muted-foreground">{value}</span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

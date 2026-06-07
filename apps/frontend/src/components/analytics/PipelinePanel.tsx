'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PipelineAnalytics } from '@/types';

interface PipelinePanelProps {
    pipeline?: PipelineAnalytics;
}

export function PipelinePanel({ pipeline }: PipelinePanelProps) {
    if (!pipeline) return null;

    const rt = pipeline.response_time;
    if (!rt) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Lead funnel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {pipeline.funnel.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No lead data yet</p>
                    ) : (
                        pipeline.funnel.map((row) => (
                            <div key={row.stage} className="flex items-center gap-2">
                                <span className="text-xs w-32 truncate capitalize">{row.stage}</span>
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[var(--chart-1)] rounded-full"
                                        style={{ width: `${Math.max(row.pct, 4)}%` }}
                                    />
                                </div>
                                <span className="text-xs tabular-nums w-12 text-right">
                                    {row.count} ({row.pct}%)
                                </span>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Response time (measured)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold">{rt.median_display}</p>
                        <p className="text-xs text-muted-foreground">Median</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{rt.p95_display}</p>
                        <p className="text-xs text-muted-foreground">P95</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{rt.average_display}</p>
                        <p className="text-xs text-muted-foreground">Average</p>
                    </div>
                    <p className="col-span-3 text-xs text-muted-foreground">
                        Based on {rt.sample_size} user→agent/AI reply pairs
                    </p>
                </CardContent>
            </Card>

            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Agent workload</CardTitle>
                </CardHeader>
                <CardContent>
                    {pipeline.agent_workload.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No assignments yet</p>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {pipeline.agent_workload.map((a) => (
                                <div
                                    key={a.agent}
                                    className="px-3 py-2 rounded-lg border bg-muted/30 text-sm"
                                >
                                    <span className="font-medium">{a.agent}</span>
                                    <span className="text-muted-foreground ml-2">{a.count} leads</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

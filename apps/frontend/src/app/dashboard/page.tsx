'use client';

import { useAnalytics } from '@/hooks/useAnalytics';
import { useConversations } from '@/hooks/useConversations';
import { AnalyticsCard } from '@/components/analytics/AnalyticsCard';
import { LeadStatusChart } from '@/components/analytics/LeadStatusChart';
import { MetricsBarChart } from '@/components/analytics/MetricsBarChart';
import { SuccessRateRing } from '@/components/analytics/SuccessRateRing';
import { PipelinePanel } from '@/components/analytics/PipelinePanel';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Send, Users, Calendar, FileCheck, FileInput, Clock, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import { pageContentPad, pageWrap } from '@/components/settings/settings-layout';
import { cn } from '@/lib/utils';

const pageClassName = cn(pageWrap, pageContentPad, 'space-y-4 sm:space-y-6');

export default function DashboardPage() {
    const { analytics, isLoading: analyticsLoading } = useAnalytics();
    const { conversations, isLoading: conversationsLoading } = useConversations();

    const conversationStats = useMemo(() => ({
        total: conversations.length,
        newLead: conversations.filter(c => c.lead_status === 'new lead').length,
        appSent: conversations.filter(c => c.lead_status === 'application sent').length,
        appIn: conversations.filter(c => c.lead_status === 'application in').length,
        onHold: conversations.filter(c => c.lead_status === 'on hold').length,
        lost: conversations.filter(c => c.lead_status === 'lost').length,
    }), [conversations]);

    const isLoading = analyticsLoading || conversationsLoading;

    if (isLoading) {
        return (
            <div className={pageClassName} data-page-loading>
                <div className="space-y-3">
                    <Skeleton className="h-6 w-48" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-8 w-12" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-lg border bg-card p-4">
                            <Skeleton className="h-5 w-32 mb-4" />
                            <Skeleton className="h-[280px] w-full" />
                        </div>
                    ))}
                </div>

                <div className="space-y-3">
                    <Skeleton className="h-6 w-36" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className={`${pageClassName} text-center text-muted-foreground`}>
                Failed to load dashboard data
            </div>
        );
    }

    return (
        <div className={pageClassName}>
            <div>
                <h2 className="text-lg font-semibold mb-3">Conversation Statistics</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                    <AnalyticsCard title="Total Conversations" value={conversationStats.total} icon={Users} index={0} />
                    <AnalyticsCard title="New Leads" value={conversationStats.newLead} icon={Users} index={1} />
                    <AnalyticsCard title="Application Sent" value={conversationStats.appSent} icon={FileCheck} index={2} />
                    <AnalyticsCard title="Application In" value={conversationStats.appIn} icon={FileInput} index={3} />
                    <AnalyticsCard title="On Hold" value={conversationStats.onHold} icon={Clock} index={4} />
                    <AnalyticsCard title="Lost" value={conversationStats.lost} icon={XCircle} index={5} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <LeadStatusChart data={conversationStats} />
                <MetricsBarChart analytics={analytics} />
                <SuccessRateRing rate={analytics.success_rate} responseTime={analytics.average_response_time} />
            </div>

            <div>
                <h2 className="text-lg font-semibold mb-3">Pipeline & performance</h2>
                <PipelinePanel pipeline={analytics.pipeline} />
            </div>

            <div>
                <h2 className="text-lg font-semibold mb-3">General Metrics</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <AnalyticsCard title="Total Messages" value={analytics.total_messages} icon={MessageSquare} index={0} />
                    <AnalyticsCard title="Total Responses" value={analytics.total_responses} icon={Send} index={1} />
                    <AnalyticsCard title="Unique Users" value={analytics.unique_users} icon={Users} index={2} />
                    <AnalyticsCard title="Messages Today" value={analytics.messages_today} icon={Calendar} index={3} />
                </div>
            </div>
        </div>
    );
}

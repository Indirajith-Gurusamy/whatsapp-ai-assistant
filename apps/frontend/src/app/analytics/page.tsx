'use client';

import { useAnalytics } from '@/hooks/useAnalytics';
import { useConversations } from '@/hooks/useConversations';
import { AnalyticsCard } from '@/components/analytics/AnalyticsCard';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Send, Percent, Users, Calendar, Clock, FileCheck, FileInput, XCircle } from 'lucide-react';
import { useMemo } from 'react';

export default function AnalyticsPage() {
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
            <div className="p-4 md:p-6 space-y-6">
                {/* Page Header skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-64" />
                </div>

                {/* Conversation Stats skeleton */}
                <div className="space-y-3">
                    <Skeleton className="h-6 w-48" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-8 w-12" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* General Metrics skeleton */}
                <div className="space-y-3">
                    <Skeleton className="h-6 w-36" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
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
            <div className="p-6 text-center text-muted-foreground">
                Failed to load analytics
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">Analytics</h1>
                <p className="text-muted-foreground">Performance and engagement metrics</p>
            </div>

            {/* Conversation Stats */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Conversation Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <AnalyticsCard
                        title="Total Conversations"
                        value={conversationStats.total}
                        icon={Users}
                    />
                    <AnalyticsCard
                        title="New Leads"
                        value={conversationStats.newLead}
                        icon={Users}
                    />
                    <AnalyticsCard
                        title="Application Sent"
                        value={conversationStats.appSent}
                        icon={FileCheck}
                    />
                    <AnalyticsCard
                        title="Application In"
                        value={conversationStats.appIn}
                        icon={FileInput}
                    />
                    <AnalyticsCard
                        title="On Hold"
                        value={conversationStats.onHold}
                        icon={Clock}
                    />
                    <AnalyticsCard
                        title="Lost"
                        value={conversationStats.lost}
                        icon={XCircle}
                    />
                </div>
            </div>

            {/* General Analytics */}
            <div>
                <h2 className="text-lg font-semibold mb-3">General Metrics</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnalyticsCard
                        title="Total Messages"
                        value={analytics.total_messages}
                        icon={MessageSquare}
                    />
                    <AnalyticsCard
                        title="Total Responses"
                        value={analytics.total_responses}
                        icon={Send}
                    />
                    <AnalyticsCard
                        title="Success Rate"
                        value={`${analytics.success_rate}%`}
                        icon={Percent}
                    />
                    <AnalyticsCard
                        title="Unique Users"
                        value={analytics.unique_users}
                        icon={Users}
                    />
                    <AnalyticsCard
                        title="Messages Today"
                        value={analytics.messages_today}
                        icon={Calendar}
                    />
                    <AnalyticsCard
                        title="Avg Response Time"
                        value={analytics.average_response_time}
                        icon={Clock}
                    />
                </div>
            </div>
        </div>
    );
}

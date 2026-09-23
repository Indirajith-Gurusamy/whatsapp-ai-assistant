'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { hrDashboard, type HrDashboardData } from '@/lib/recruitment';
import { AnalyticsCard } from '@/components/analytics/AnalyticsCard';
import { LeadStatusChart } from '@/components/analytics/LeadStatusChart';
import { MetricsBarChart } from '@/components/analytics/MetricsBarChart';
import { SuccessRateRing } from '@/components/analytics/SuccessRateRing';
import { PipelinePanel } from '@/components/analytics/PipelinePanel';
import { AiScoreBadge } from '@/components/recruitment/AiScore';
import { Skeleton } from '@/components/ui/skeleton';
import {
    MessageSquare, Send, Users, Calendar, FileCheck, FileInput, Clock, XCircle,
    Briefcase, Building2, UserRound, CheckCircle2, FileText,
} from 'lucide-react';
import { useMemo } from 'react';
import { pageContentPad, pageWrap } from '@/components/settings/settings-layout';
import { cn } from '@/lib/utils';

const pageClassName = cn(pageWrap, pageContentPad, 'space-y-4 sm:space-y-6');

export default function DashboardPage() {
    const { isAdmin, hasHRRole, isLoading: authLoading } = useAuth();
    const { analytics, isLoading: analyticsLoading } = useAnalytics();
    const { conversations, isLoading: conversationsLoading } = useConversations();

    const isHr = !authLoading && !isAdmin() && hasHRRole();
    const [hrData, setHrData] = useState<HrDashboardData | null>(null);

    useEffect(() => {
        if (!isHr) return;
        let cancelled = false;
        hrDashboard()
            .then((data) => { if (!cancelled) setHrData(data); })
            .catch(() => { if (!cancelled) setHrData(null); });
        return () => { cancelled = true; };
    }, [isHr]);

    const conversationStats = useMemo(() => ({
        total: conversations.length,
        newLead: conversations.filter(c => c.lead_status === 'new lead').length,
        appSent: conversations.filter(c => c.lead_status === 'application sent').length,
        appIn: conversations.filter(c => c.lead_status === 'application in').length,
        onHold: conversations.filter(c => c.lead_status === 'on hold').length,
        lost: conversations.filter(c => c.lead_status === 'lost').length,
    }), [conversations]);

    const isLoading = authLoading || (isHr ? hrData === null : (analyticsLoading || conversationsLoading));

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

    if (isHr) {
        if (!hrData) {
            return (
                <div className={`${pageClassName} text-center text-muted-foreground`}>
                    Failed to load dashboard data
                </div>
            );
        }

        const maxStage = Math.max(1, ...hrData.stages.map((s) => s.candidates_count));

        return (
            <div className={pageClassName}>
                <div>
                    <h2 className="text-lg font-semibold mb-3">Recruitment Overview</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                        <AnalyticsCard title="Published Jobs" value={hrData.published_jobs} icon={Briefcase} index={0} />
                        <AnalyticsCard title="Total Jobs" value={hrData.total_jobs} icon={Building2} index={1} />
                        <AnalyticsCard title="Candidates" value={hrData.total_candidates} icon={UserRound} index={2} />
                        <AnalyticsCard title="Applications" value={hrData.active_applications} icon={FileCheck} index={3} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="rounded-lg border bg-card p-4">
                        <h3 className="text-sm font-semibold mb-3">Candidates by Pipeline Stage</h3>
                        {hrData.stages.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No pipeline stages yet.</p>
                        ) : (
                            <ul className="space-y-2.5">
                                {hrData.stages.map((stage) => (
                                    <li key={stage.name} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium text-muted-foreground">{stage.name}</span>
                                            <span className="font-semibold">{stage.candidates_count}</span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-muted">
                                            <div
                                                className="h-1.5 rounded-full bg-orange-500"
                                                style={{ width: `${(stage.candidates_count / maxStage) * 100}%` }}
                                            />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="rounded-lg border bg-card p-4">
                        <h3 className="text-sm font-semibold mb-3">Latest Applications</h3>
                        {hrData.recent_applications.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No applications yet.</p>
                        ) : (
                            <ul className="space-y-3">
                                {hrData.recent_applications.map((app) => (
                                    <li key={app.id} className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{app.candidate_name}</p>
                                            <p className="truncate text-xs text-muted-foreground">{app.job_title}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {app.match_score != null && <AiScoreBadge score={app.match_score} />}
                                            <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                                {app.stage_name ?? 'Unassigned'}
                                            </span>
                                            {app.has_resume && <FileText className="h-3.5 w-3.5 text-orange-500" />}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="rounded-lg border bg-card p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold">Published Jobs</h3>
                            <Link href="/admin/jobs" className="text-xs font-medium text-orange-600 hover:underline">
                                View all
                            </Link>
                        </div>
                        {hrData.jobs.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No published jobs yet.</p>
                        ) : (
                            <ul className="space-y-3">
                                {hrData.jobs.slice(0, 6).map((job) => (
                                    <li key={job.id}>
                                        <Link href={`/admin/jobs/${job.id}`} className="block rounded-md hover:bg-accent/60 p-1.5 -mx-1.5">
                                            <p className="truncate text-sm font-medium">{job.title}</p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {[job.organization_name, job.location].filter(Boolean).join(' · ')}
                                            </p>
                                            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                {job.applications_count} application{job.applications_count === 1 ? '' : 's'}
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
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

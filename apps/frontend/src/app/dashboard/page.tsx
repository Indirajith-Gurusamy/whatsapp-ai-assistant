'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi, DashboardStats, DashboardActivity, DashboardSummary } from '@/lib/api';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { QuickActions } from '@/components/dashboard/QuickActions';

export default function DashboardPage() {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activity, setActivity] = useState<DashboardActivity[]>([]);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        } else if (isAuthenticated && user) {
            fetchDashboardData();
        }
    }, [isAuthenticated, authLoading, user, router]);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [statsData, activityData, summaryData] = await Promise.all([
                dashboardApi.getStats(),
                dashboardApi.getActivity(),
                dashboardApi.getSummary()
            ]);
            setStats(statsData);
            setActivity(activityData);
            setSummary(summaryData);
        } catch (err: any) {
            console.error('Failed to fetch dashboard data:', err);
            setError(err.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || (loading && !stats)) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                        {error}
                        <button
                            onClick={fetchDashboardData}
                            className="ml-4 underline hover:no-underline"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        {summary?.greeting}
                    </h1>
                    <p className="mt-1 text-gray-500">
                        {summary?.message}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column (Stats & Feed) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <StatCard
                                title="Total Leads"
                                value={stats?.total_items || 0}
                                icon={
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                }
                            />
                            <StatCard
                                title="Active Tasks"
                                value={stats?.active_items || 0}
                                icon={
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                }
                                trend="Current"
                                trendUp={true}
                            />
                            <StatCard
                                title="Recent Updates"
                                value={stats?.recent_activity_count || 0}
                                icon={
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                }
                                description="Last 24 hours"
                            />
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
                            <ActivityFeed activities={activity} />
                        </div>
                    </div>

                    {/* Right Column (Quick Actions & Profile/Misc) */}
                    <div className="space-y-8">
                        <QuickActions />

                        {/* Optional: Mini Profile Card or System Status */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center space-x-4 mb-4">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                                    <p className="text-xs text-gray-500">{user?.email}</p>
                                </div>
                            </div>
                            <div className="text-xs text-gray-400">
                                Role: <span className="uppercase font-semibold">{user?.role}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

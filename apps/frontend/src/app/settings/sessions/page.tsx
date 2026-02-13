"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authApi, Session } from '@/lib/api';
import { SessionCard } from '@/components/settings/SessionCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, AlertTriangle, LogOut } from 'lucide-react';

export default function SessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loggingOutId, setLoggingOutId] = useState<number | null>(null);
    const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
    const router = useRouter();

    const loadSessions = async () => {
        try {
            const data = await authApi.getSessions();
            setSessions(data.sessions);
            setError(null);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load sessions. Please try again.';
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();
    }, []);

    const handleLogoutSession = async (sessionId: number) => {
        if (!confirm('Are you sure you want to logout this session?')) return;

        setLoggingOutId(sessionId);
        try {
            await authApi.deleteSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to logout session. Please try again.');
        } finally {
            setLoggingOutId(null);
        }
    };

    const handleLogoutAll = async () => {
        if (!confirm('Are you sure you want to logout all other devices? This action cannot be undone.')) return;

        setIsLoggingOutAll(true);
        try {
            await authApi.deleteAllSessions();
            // Refresh list to show only current session
            loadSessions();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to logout all sessions. Please try again.');
        } finally {
            setIsLoggingOutAll(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto py-8 px-4">
                <div className="flex items-center justify-between mb-8">
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-40" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <Skeleton className="h-9 w-48" />
                </div>

                <div className="grid gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-48" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </div>
                            <Skeleton className="h-8 w-20" />
                        </div>
                    ))}
                </div>

                <div className="mt-8 p-4 bg-primary/5 rounded-lg">
                    <div className="flex items-start">
                        <Skeleton className="h-8 w-8 rounded-full mr-3" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-full max-w-lg" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Shield className="w-6 h-6 mr-2 text-primary" />
                        Active Sessions
                    </h1>
                    <p className="mt-1 text-gray-500">
                        Manage your active sessions and signed-in devices.
                    </p>
                </div>

                {sessions.length > 1 && (
                    <button
                        onClick={handleLogoutAll}
                        disabled={isLoggingOutAll}
                        className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        {isLoggingOutAll ? 'Logging out...' : 'Logout All Other Devices'}
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            <div className="grid gap-4">
                {sessions.map(session => (
                    <SessionCard
                        key={session.id}
                        session={session}
                        onLogout={handleLogoutSession}
                        isLoggingOut={loggingOutId === session.id}
                    />
                ))}
            </div>

            <div className="mt-8 p-4 bg-primary/5 rounded-lg flex items-start">
                <div className="p-2 bg-primary/10 rounded-full mr-3">
                    <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-primary">Security Note</h4>
                    <p className="mt-1 text-sm text-primary/90">
                        If you see any suspicious activity, we recommend logging out all other devices and changing your password immediately.
                        Inactive sessions are automatically logged out after 2 days.
                    </p>
                </div>
            </div>
        </div>
    );
}

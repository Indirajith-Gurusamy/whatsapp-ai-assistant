"use client";

import React, { useEffect, useState } from 'react';
import { authApi, Session } from '@/lib/api';
import { SessionCard } from '@/components/settings/SessionCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Shield, AlertTriangle, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { pageCard, pageContentPad, pageToolbarRow, pageWrap } from '@/components/settings/settings-layout';

export default function SessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loggingOutId, setLoggingOutId] = useState<number | null>(null);
    const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
    const [sessionToLogout, setSessionToLogout] = useState<number | null>(null);
    const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);

    const loadSessions = async () => {
        try {
            const data = await authApi.getSessions();
            setSessions(data.sessions);
            setError(null);
        } catch (err) {
            setError('Failed to load sessions');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();
    }, []);

    const handleLogoutSession = async () => {
        if (sessionToLogout === null) return;

        setLoggingOutId(sessionToLogout);
        try {
            await authApi.deleteSession(sessionToLogout);
            setSessions(prev => prev.filter(s => s.id !== sessionToLogout));
            setSessionToLogout(null);
            toast.success('Session logged out');
        } catch {
            toast.error('Failed to logout session');
        } finally {
            setLoggingOutId(null);
        }
    };

    const handleLogoutAll = async () => {
        setIsLoggingOutAll(true);
        try {
            await authApi.deleteAllSessions();
            setShowLogoutAllConfirm(false);
            loadSessions();
            toast.success('Logged out all other devices');
        } catch {
            toast.error('Failed to logout all sessions');
        } finally {
            setIsLoggingOutAll(false);
        }
    };

    if (isLoading) {
        return (
            <div className={pageWrap}>
                <div className={pageCard}>
                    <div className={pageToolbarRow}>
                        <Skeleton className="h-9 w-48" />
                    </div>
                    <div className={pageContentPad}>

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
                </div>
            </div>
        );
    }

    return (
        <div className={pageWrap}>
            <div className={pageCard}>
                {sessions.length > 1 && (
                    <div className={pageToolbarRow}>
                        <button
                            onClick={() => setShowLogoutAllConfirm(true)}
                            disabled={isLoggingOutAll}
                            className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            {isLoggingOutAll ? 'Logging out...' : 'Logout All Other Devices'}
                        </button>
                    </div>
                )}

                <div className={pageContentPad}>

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
                        onLogout={setSessionToLogout}
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
            </div>

            <ConfirmDialog
                open={sessionToLogout !== null}
                onOpenChange={(open) => {
                    if (!open) setSessionToLogout(null);
                }}
                title="Logout this session?"
                description="Are you sure you want to logout this session?"
                confirmLabel="Logout"
                loadingLabel="Logging out..."
                variant="destructive"
                isLoading={loggingOutId !== null}
                onConfirm={handleLogoutSession}
            />

            <ConfirmDialog
                open={showLogoutAllConfirm}
                onOpenChange={setShowLogoutAllConfirm}
                title="Logout all other devices?"
                description="Are you sure you want to logout all other devices? This action cannot be undone."
                confirmLabel="Logout All"
                loadingLabel="Logging out..."
                variant="destructive"
                isLoading={isLoggingOutAll}
                onConfirm={handleLogoutAll}
            />
        </div>
    );
}

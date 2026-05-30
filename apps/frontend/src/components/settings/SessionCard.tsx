"use client";

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Session } from '@/lib/api';
import { themeClasses } from '@/lib/theme';
import {
    Monitor,
    Smartphone,
    Tablet,
    Globe,
    Clock,
    Trash2,
} from 'lucide-react';

interface SessionCardProps {
    session: Session;
    onLogout: (sessionId: number) => void;
    isLoggingOut: boolean;
}

export const SessionCard: React.FC<SessionCardProps> = ({
    session,
    onLogout,
    isLoggingOut
}) => {
    const getDeviceIcon = (type: string | null) => {
        switch (type?.toLowerCase()) {
            case 'mobile':
                return <Smartphone className="w-5 h-5 text-blue-500" />;
            case 'tablet':
                return <Tablet className="w-5 h-5 text-purple-500" />;
            case 'desktop':
                return <Monitor className={`w-5 h-5 ${themeClasses.iconPrimary}`} />;
            default:
                return <Monitor className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className={`bg-white rounded-lg border p-4 transition-all ${session.isCurrent ? 'border-primary ring-1 ring-primary/10' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                    <div className="p-2 bg-gray-50 rounded-full">
                        {getDeviceIcon(session.deviceType ?? null)}
                    </div>

                    <div>
                        <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900">
                                {session.browser || 'Unknown Browser'}
                            </h3>
                            {session.isCurrent && (
                                <span className={`px-2 py-0.5 text-xs font-medium ${themeClasses.badgePrimary} rounded-full`}>
                                    Current Session
                                </span>
                            )}
                        </div>

                        <div className="mt-1 space-y-1">
                            <div className="flex items-center text-sm text-gray-500">
                                <span className="mr-2">{session.os || 'Unknown OS'}</span>
                                {session.browserVersion && (
                                    <span className="text-gray-400">• {session.browserVersion}</span>
                                )}
                            </div>

                            <div className="flex items-center text-sm text-gray-500 space-x-4">
                                <div className="flex items-center">
                                    <Globe className="w-3.5 h-3.5 mr-1" />
                                    {session.location || 'Unknown Location'}
                                </div>
                                <div className="flex items-center">
                                    <Clock className="w-3.5 h-3.5 mr-1" />
                                    {formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })}
                                </div>
                            </div>

                            {session.ipAddress && (
                                <div className="text-xs text-gray-400 font-mono mt-1">
                                    IP: {session.ipAddress}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {!session.isCurrent && (
                    <button
                        onClick={() => onLogout(session.id)}
                        disabled={isLoggingOut}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                        title="Logout this session"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

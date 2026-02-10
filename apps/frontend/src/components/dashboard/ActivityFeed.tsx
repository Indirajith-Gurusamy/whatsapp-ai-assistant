import React from 'react';
import { DashboardActivity } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { themeClasses } from '@/lib/theme';

interface ActivityFeedProps {
    activities: DashboardActivity[];
    isLoading?: boolean;
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
    if (isLoading) {
        return <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
            ))}
        </div>;
    }

    if (activities.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No recent activity found.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex-shrink-0">
                        <div className={`w-2 h-2 mt-2 rounded-full ${activity.status === 'active' ? themeClasses.bgPrimary : 'bg-gray-400'
                            }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                            {activity.customer_name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                            {activity.last_message || 'Status update'}
                        </p>
                        <div className="mt-1 flex items-center text-xs text-gray-400">
                            <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                            <span className="mx-1">•</span>
                            <span className="capitalize">{activity.lead_status}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

import React from 'react';

interface StatCardProps {
    title: string;
    value: number | string;
    icon?: React.ReactNode;
    trend?: string;
    trendUp?: boolean;
    description?: string;
}

export function StatCard({ title, value, icon, trend, trendUp, description }: StatCardProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className="text-2xl font-bold mt-2 text-gray-900">{value}</h3>
                </div>
                {icon && (
                    <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                        {icon}
                    </div>
                )}
            </div>

            {(trend || description) && (
                <div className="mt-4 flex items-center text-sm">
                    {trend && (
                        <span className={`font-medium ${trendUp ? 'text-green-600' : 'text-red-600'} mr-2`}>
                            {trend}
                        </span>
                    )}
                    {description && (
                        <span className="text-gray-500">{description}</span>
                    )}
                </div>
            )}
        </div>
    );
}

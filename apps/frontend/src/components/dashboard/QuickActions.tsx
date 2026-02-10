import React from 'react';
import Link from 'next/link';
import { themeClasses } from '@/lib/theme';

export function QuickActions() {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
                <Link
                    href="/conversations"
                    className="flex flex-col items-center justify-center p-4 bg-primary/5 rounded-xl hover:bg-indigo-100 transition-colors group"
                >
                    <div className="p-2 bg-white rounded-full text-primary mb-2 group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-primary">My Leads</span>
                </Link>

                <Link
                    href="/profile"
                    className={`flex flex-col items-center justify-center p-4 ${themeClasses.bgPrimaryLight} rounded-xl ${themeClasses.bgPrimaryLightHover} transition-colors group`}
                >
                    <div className={`p-2 bg-white rounded-full ${themeClasses.textPrimary} mb-2 group-hover:scale-110 transition-transform`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <span className={`text-sm font-medium ${themeClasses.textPrimaryDarker}`}>My Profile</span>
                </Link>

                <Link
                    href="/conversations?filter=active"
                    className="flex flex-col items-center justify-center p-4 bg-primary/10 rounded-xl hover:bg-blue-100 transition-colors group"
                >
                    <div className="p-2 bg-white rounded-full text-primary mb-2 group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-primary">Active Tasks</span>
                </Link>

                <button
                    disabled
                    className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl text-gray-400 cursor-not-allowed"
                    title="Coming Soon"
                >
                    <div className="p-2 bg-gray-200 rounded-full text-gray-400 mb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium">Reports</span>
                </button>
            </div>
        </div>
    );
}

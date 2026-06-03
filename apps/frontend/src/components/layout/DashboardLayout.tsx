'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { pageScrollClass } from './PageScroll';
import { useIsClient } from '@/hooks/useIsClient';
import { AppAssistant } from '@/components/assistant/AppAssistant';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const mounted = useIsClient();

    // Show a minimal layout shell during SSR/hydration
    if (!mounted) {
        return (
            <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950">
                {/* Sidebar skeleton */}
                <aside className="hidden lg:flex flex-col w-56 bg-card border-r border-border/50">
                    <div className="flex items-center px-4 py-3 border-b border-border/50 min-h-[57px]">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-5 w-24 ml-2" />
                    </div>
                    <nav className="flex-1 px-3 py-4">
                        <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full rounded-lg" />
                            ))}
                        </div>
                    </nav>
                </aside>
                {/* Main content area */}
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    {/* TopBar skeleton */}
                    <header className="sticky top-0 z-40 flex items-center gap-4 px-4 md:px-6 py-3 bg-card/80 border-b border-border/50">
                        <Skeleton className="h-8 w-8 lg:hidden" />
                        <div className="flex-1" />
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                    </header>
                    <main className={cn('relative flex flex-col', pageScrollClass)}>
                        {children}
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950">
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-white dark:bg-gray-900">
                <TopBar />
                <main className={cn('relative flex flex-1 flex-col min-h-0', pageScrollClass)}>
                    {children}
                </main>
                <AppAssistant />
            </div>
        </div>
    );
}

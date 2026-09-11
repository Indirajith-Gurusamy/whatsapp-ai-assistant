'use client';

import Link from 'next/link';
import type { CareersSettings } from '@/lib/recruitment';
import { Briefcase } from 'lucide-react';

interface CareersShellProps {
    settings: CareersSettings | null;
    children: React.ReactNode;
}

export function CareersShell({ settings, children }: CareersShellProps) {
    const company = settings?.company_name || 'Our Company';
    const careersUrl = settings?.careers_url || '/careers';
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
            <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur dark:bg-gray-900/95">
                <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
                    <Link href={careersUrl} className="flex items-center gap-2">
                        {settings?.company_logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={settings.company_logo_url}
                                alt={`${company} logo`}
                                className="h-9 w-auto max-w-[200px] object-contain"
                            />
                        ) : settings && !settings.company_logo_url ? (
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 text-white">
                                <Briefcase className="h-5 w-5" />
                            </div>
                        ) : null}
                    </Link>
                    <nav className="flex items-center gap-4 text-sm">
                        <Link href="/careers/jobs" className="font-medium text-gray-700 hover:text-orange-600 dark:text-gray-300">
                            Jobs
                        </Link>
                    </nav>
                </div>
            </header>
            <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">{children}</main>
            <footer className="border-t py-8">
                <div className="mx-auto max-w-4xl px-4 text-center text-sm text-gray-500 sm:px-6">
                    {company} Careers
                </div>
            </footer>
        </div>
    );
}
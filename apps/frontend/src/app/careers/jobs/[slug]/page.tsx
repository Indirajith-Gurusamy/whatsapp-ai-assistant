'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CareersShell } from '@/components/careers/CareersShell';
import { careersApi, formatSalary, type CareersJob, type CareersSettings } from '@/lib/recruitment';
import { ArrowLeft, Briefcase, Clock, Globe, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/ui/markdown';

export default function CareersJobDetailPage() {
    const params = useParams<{ slug: string }>();
    const slug = params.slug;
    const [settings, setSettings] = useState<CareersSettings | null>(null);
    const [job, setJob] = useState<CareersJob | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [s, j] = await Promise.all([
                    careersApi.settings(),
                    careersApi.job(slug),
                ]);
                if (cancelled) return;
                setSettings(s);
                setJob(j);
            } catch {
                if (!cancelled) setNotFound(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    return (
        <CareersShell settings={settings}>
            {loading ? (
                <div className="space-y-4">
                    <div className="h-10 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                    <div className="h-40 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
                    <div className="h-28 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
                </div>
            ) : notFound || !job ? (
                <div className="rounded-lg border bg-white p-10 text-center dark:bg-gray-900">
                    <h1 className="text-lg font-bold">Job not found</h1>
                    <p className="mt-1 text-sm text-gray-500">This position may no longer be open.</p>
                    <Link href="/careers/jobs" className="mt-4 inline-block text-sm font-medium text-orange-600 hover:underline">
                        View all jobs
                    </Link>
                </div>
            ) : (
                <>
                    <Link href="/careers/jobs" className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-orange-600">
                        <ArrowLeft className="h-4 w-4" /> All jobs
                    </Link>

                    <div className="mt-4 rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-900 sm:p-8">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold sm:text-3xl">{job.title}</h1>
                            </div>
                            <div className="text-left sm:text-right">
                                {(job.salary_min != null || job.salary_max != null || job.salary_negotiable) && (
                                    <div className="text-lg font-bold text-orange-600">{formatSalary(job)}</div>
                                )}
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
                                    {job.headcount > 0 && (
                                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {job.headcount} {job.headcount === 1 ? 'position' : 'positions'}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                            {job.location && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                    <MapPin className="h-3.5 w-3.5" /> {job.location}
                                </span>
                            )}
                            {job.is_remote && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                    <Globe className="h-3.5 w-3.5" /> Remote
                                </span>
                            )}
                            {job.contract_type && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                    <Briefcase className="h-3.5 w-3.5" /> {job.contract_type}
                                </span>
                            )}
                            {job.experience && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                    <Clock className="h-3.5 w-3.5" /> {job.experience}
                                </span>
                            )}
                            {(job.tags ?? []).length > 0 &&
                                job.tags.map((t) => (
                                    <span key={t} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                        {t}
                                    </span>
                                ))}
                        </div>

                        <div className="mt-6">
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">About this role</h2>
                            <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                <Markdown>{job.description || 'No description provided.'}</Markdown>
                            </div>
                        </div>

                        <div className="mt-8">
                            {settings && !settings.enabled ? (
                                <p className="rounded-md border-2 border-dashed p-4 text-center text-sm text-gray-500">
                                    Applications are currently closed.
                                </p>
                            ) : (
                                <Link href={`/careers/jobs/${job.slug}/apply`}>
                                    <Button className="h-11 w-full sm:w-auto sm:px-8 text-base">
                                        Apply now
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </>
            )}
        </CareersShell>
    );
}
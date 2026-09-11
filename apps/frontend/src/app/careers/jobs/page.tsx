'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CareersShell } from '@/components/careers/CareersShell';
import { careersApi, formatSalary, type CareersJob, type CareersSettings } from '@/lib/recruitment';
import { Briefcase, MapPin, Globe, Clock, ChevronRight } from 'lucide-react';
import { ListPageToolbar } from '@/components/data/ListPageToolbar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function CareersJobsPage() {
    const [settings, setSettings] = useState<CareersSettings | null>(null);
    const [jobs, setJobs] = useState<CareersJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('all');
    const [experience, setExperience] = useState('all');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [s, j] = await Promise.all([careersApi.settings(), careersApi.jobs()]);
                if (cancelled) return;
                setSettings(s);
                setJobs(j);
            } catch {
                if (!cancelled) setError('Could not load openings right now. Please try again later.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const locations = useMemo(
        () => Array.from(new Set(jobs.map((j) => j.location).filter((l): l is string => !!l))).sort(),
        [jobs]
    );
    const experiences = useMemo(
        () => Array.from(new Set(jobs.map((j) => j.experience).filter((x): x is string => !!x))).sort(),
        [jobs]
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return jobs.filter((job) => {
            if (q && !job.title.toLowerCase().includes(q)) return false;
            if (location !== 'all' && job.location !== location) return false;
            if (experience !== 'all' && job.experience !== experience) return false;
            return true;
        });
    }, [jobs, query, location, experience]);

    return (
        <CareersShell settings={settings}>
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Open positions</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {filtered.length} {filtered.length === 1 ? 'opening' : 'openings'}
                    </p>
                </div>
            </div>

            <ListPageToolbar
                className="mt-4 px-0 md:px-0"
                searchValue={query}
                onSearchChange={setQuery}
                searchPlaceholder="Search by job title…"
                searchClassName="h-12 text-base"
                toolbarExtra={
                    <>
                        <Select value={location} onValueChange={setLocation}>
                            <SelectTrigger className="h-12 w-auto min-w-0">
                                <SelectValue placeholder="All locations" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All locations</SelectItem>
                                {locations.map((l) => (
                                    <SelectItem key={l} value={l}>{l}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={experience} onValueChange={setExperience}>
                            <SelectTrigger className="h-12 w-auto min-w-0">
                                <SelectValue placeholder="All experience" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All experience</SelectItem>
                                {experiences.map((x) => (
                                    <SelectItem key={x} value={x}>{x}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </>
                }
            />

            {loading ? (
                <div className="mt-6 space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-28 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
                    ))}
                </div>
            ) : error ? (
                <div className="mt-6 rounded-lg border bg-white p-8 text-center dark:bg-gray-900">
                    <p className="text-gray-600 dark:text-gray-400">{error}</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="mt-6 rounded-lg border bg-white p-10 text-center dark:bg-gray-900">
                    <Briefcase className="mx-auto h-10 w-10 text-gray-400" />
                    <p className="mt-3 text-gray-500">
                        {jobs.length === 0
                            ? 'No open positions right now. Check back soon!'
                            : 'No openings match your filters.'}
                    </p>
                </div>
            ) : (
                <div className="mt-6 space-y-3">
                    {filtered.map((job) => (
                        <Link
                            key={job.id}
                            href={`/careers/jobs/${job.slug}`}
                            className="group block rounded-lg border bg-white p-5 shadow-sm transition-colors hover:border-orange-300 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-950"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-lg font-semibold transition-colors group-hover:text-orange-600">
                                        {job.title}
                                    </h3>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                                        {job.location && (
                                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
                                        )}
                                        {job.is_remote && (
                                            <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Remote</span>
                                        )}
                                        {job.contract_type && (
                                            <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {job.contract_type}</span>
                                        )}
                                        {job.experience && (
                                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {job.experience}</span>
                                        )}
                                    </div>
                                    {(job.tags ?? []).length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {job.tags.map((t) => (
                                                <span key={t} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {(job.salary_min != null || job.salary_max != null || job.salary_negotiable) && (
                                    <div className="shrink-0 text-sm font-semibold text-orange-600">
                                        {formatSalary(job)}
                                    </div>
                                )}
                                <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-600" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </CareersShell>
    );
}
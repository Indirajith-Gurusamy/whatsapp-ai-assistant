'use client';

import { Sparkles } from 'lucide-react';
import type { AiScreening } from '@/lib/recruitment';
import { formatDateTime } from '@/lib/recruitment';

export function recommendationFor(score: number | null | undefined): string {
    if (score === null || score === undefined) return 'Not screened';
    if (score >= 80) return 'Strong Match';
    if (score >= 60) return 'Consider';
    if (score >= 40) return 'Weak Match';
    return 'Reject';
}

export function recommendationClasses(score: number | null | undefined): string {
    if (score === null || score === undefined) return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
    if (score >= 80) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    if (score >= 60) return 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300';
    if (score >= 40) return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
    return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
}

export function scoreColor(score: number | null | undefined): string {
    if (score === null || score === undefined) return 'text-muted-foreground';
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-sky-600 dark:text-sky-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
}

export function AiScoreBadge({ score, className = '' }: { score: number | null | undefined; className?: string }) {
    if (score === null || score === undefined) {
        return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${recommendationClasses(score)} ${className}`}>
            —
        </span>;
    }
    return (
        <span
            title={recommendationFor(score)}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${recommendationClasses(score)} ${className}`}
        >
            <Sparkles className="h-3 w-3" />
            {score}%
            <span className="hidden font-normal lg:inline">{recommendationFor(score)}</span>
        </span>
    );
}

export function AiScreeningPanel({ screening }: { screening: AiScreening | null }) {
    if (!screening) return null;
    const rec = screening.recommendation || recommendationFor(screening.score);
    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${recommendationClasses(screening.score)}`}>
                    <Sparkles className="h-3.5 w-3.5" />
                    {screening.score !== null ? `${screening.score}%` : '—'} {rec}
                </span>
                {screening.screened_at && (
                    <span className="text-xs text-muted-foreground">
                        {formatDateTime(screening.screened_at)}
                        {screening.model ? ` · ${screening.model}` : ''}
                    </span>
                )}
            </div>

            {screening.summary && (
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">{screening.summary}</p>
            )}

            {(screening.strengths?.length ?? 0) > 0 && (
                <div className="mt-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Strengths</div>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {screening.strengths!.map((s, i) => (
                            <li key={i}>{s}</li>
                        ))}
                    </ul>
                </div>
            )}

            {(screening.concerns?.length ?? 0) > 0 && (
                <div className="mt-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">Concerns</div>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {screening.concerns!.map((s, i) => (
                            <li key={i}>{s}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
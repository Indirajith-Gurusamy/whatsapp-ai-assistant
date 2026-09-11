'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ListPageShell } from '@/components/data/ListPageShell';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/recruitment/ConfirmDialog';
import { JobFormDialog } from '@/components/recruitment/JobFormDialog';
import {
    jobsApi,
    formatDate,
    formatSalary,
    type JobItem,
} from '@/lib/recruitment';
import { useAuth } from '@/contexts/AuthContext';
import { ListPageSkeleton } from '@/components/data/ListPageSkeleton';
import { DataTable } from '@/components/data/DataTable';
import { jobFilterFields } from '@/lib/table-filter-presets';
import { toast } from 'sonner';
import {
    Archive,
    Briefcase,
    MoreVertical,
    Pencil,
    ArrowUpRight,
    Circle,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function statusBadge(status: string) {
    if (status === 'ACTIVE')
        return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
            <Circle className="h-1.5 w-1.5 fill-current" /> Active
        </span>;
    if (status === 'ARCHIVED')
        return <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            <Circle className="h-1.5 w-1.5 fill-current" /> Archived
        </span>;
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        <Circle className="h-1.5 w-1.5 fill-current" /> Draft
    </span>;
}

export default function JobsPage() {
    const { isAdminOrHR, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [jobs, setJobs] = useState<JobItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<JobItem | null>(null);
    const [archiveTarget, setArchiveTarget] = useState<JobItem | null>(null);
    const [archiving, setArchiving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await jobsApi.list();
            setJobs(res.items);
            setTotal(res.total);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load jobs');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleExport = async () => {
        if (jobs.length === 0) {
            toast.warning('No data available to export');
            return;
        }

        setIsExporting(true);

        try {
            await new Promise((resolve) => setTimeout(resolve, 800));

            const headers = [
                'ID',
                'Title',
                'Client',
                'Status',
                'Published',
                'Location',
                'Remote',
                'Contract Type',
                'Experience',
                'Salary',
                'Salary Frequency',
                'Negotiable',
                'Headcount',
                'Candidates',
                'Tags',
                'Created At',
            ];

            const rows = jobs.map((job) => [
                job.id,
                `"${(job.title || '').replace(/"/g, '""')}"`,
                `"${(job.organization_name || '').replace(/"/g, '""')}"`,
                job.status,
                job.is_published ? 'Published' : 'Hidden',
                `"${(job.location || '').replace(/"/g, '""')}"`,
                job.is_remote ? 'Remote' : 'On-site',
                job.contract_type || '',
                job.experience || '',
                formatSalary(job),
                job.salary_frequency || '',
                job.salary_negotiable ? 'Yes' : 'No',
                job.headcount,
                job.candidates_count ?? 0,
                `"${(job.tags ?? []).join(', ').replace(/"/g, '""')}"`,
                job.created_at,
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map((row) => row.join(',')),
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            link.setAttribute('href', url);
            link.setAttribute('download', `jobs_export_${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to generate export file');
        } finally {
            setIsExporting(false);
        }
    };

    if (authLoading) return <ListPageSkeleton columns={6} />;

    if (!isAdminOrHR()) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <p className="text-muted-foreground">Only administrators can access Recruitment.</p>
            </div>
        );
    }

    const openCreate = () => {
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (job: JobItem) => {
        setEditing(job);
        setModalOpen(true);
    };

    const togglePublished = async (job: JobItem) => {
        try {
            await jobsApi.setPublished(job.id, !job.is_published);
            toast.success(job.is_published ? 'Job hidden from careers page' : 'Job published to careers page');
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update job');
        }
    };

    const confirmArchive = async () => {
        if (!archiveTarget) return;
        setArchiving(true);
        try {
            await jobsApi.update(archiveTarget.id, { status: 'ARCHIVED' });
            toast.success('Job archived');
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to archive job');
        } finally {
            setArchiving(false);
            setArchiveTarget(null);
        }
    };

    const columns = [
        {
            key: 'job',
            header: 'JOB',
            cell: (job: JobItem) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        <Briefcase className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <Link href={`/admin/jobs/${job.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-orange-600">
                            {job.title}
                        </Link>
                        <div className="truncate text-xs text-muted-foreground max-w-[220px]">
                            {job.organization_name ?? 'No client'}
                            {job.location ? ` · ${job.location}` : ''}
                            {job.is_remote ? ' · Remote' : ''}
                            {job.contract_type ? ` · ${job.contract_type}` : ''}
                        </div>
                    </div>
                </div>
            ),
        },
        { key: 'status', header: 'STATUS', cell: (job: JobItem) => statusBadge(job.status) },
        {
            key: 'live',
            header: 'LIVE',
            cell: (job: JobItem) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        togglePublished(job);
                    }}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                        job.is_published
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                    title={job.is_published ? 'Click to unpublish' : 'Click to publish'}
                >
                    <Circle className="h-1.5 w-1.5 fill-current" />
                    {job.is_published ? 'Published' : 'Hidden'}
                </button>
            ),
        },
        {
            key: 'candidates',
            header: 'CANDIDATES',
            className: 'text-center',
            cell: (job: JobItem) => (
                <span className="inline-flex min-w-6 justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {job.candidates_count}
                </span>
            ),
        },
        {
            key: 'salary',
            header: 'SALARY',
            className: 'hidden lg:table-cell',
            cell: (job: JobItem) => (
                <span className="text-xs text-muted-foreground">{formatSalary(job)}</span>
            ),
        },
        {
            key: 'created',
            header: 'CREATED',
            className: 'hidden md:table-cell',
            cell: (job: JobItem) => (
                <span className="text-xs text-muted-foreground">{formatDate(job.created_at)}</span>
            ),
        },
        {
            key: 'actions',
            header: 'ACTIONS',
            className: 'w-[72px] text-right',
            cell: (job: JobItem) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); togglePublished(job); }}>
                            <ArrowUpRight className="h-4 w-4" />
                            {job.is_published ? 'Unpublish' : 'Publish'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/admin/jobs/${job.id}`); }}>
                            <ArrowUpRight className="h-4 w-4" /> Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(job); }}>
                            <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={(e) => { e.stopPropagation(); setArchiveTarget(job); }}>
                            <Archive className="h-4 w-4" /> Archive
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    const isInitialLoading = loading && jobs.length === 0;

    return (
        <ListPageShell>
            {isInitialLoading ? (
                <ListPageSkeleton columns={7} />
            ) : (
                <DataTable
                    className="flex flex-1 flex-col min-h-0"
                    data={jobs}
                    columns={columns}
                    onRowClick={(job) => router.push(`/admin/jobs/${job.id}`)}
                    searchPlaceholder="Search jobs…"
                    addLabel="New Job"
                    onAdd={openCreate}
                    searchFields={['title', 'organization_name', 'location', 'status', 'tags']}
                    filterFields={jobFilterFields}
                    onExport={handleExport}
                    isExporting={isExporting}
                    emptyMessage={total === 0 ? 'No jobs yet. Create your first job.' : 'No jobs match your search.'}
                />
            )}

            <JobFormDialog
                open={modalOpen}
                onOpenChange={setModalOpen}
                job={editing}
                onSaved={load}
            />

            <ConfirmDialog
                open={!!archiveTarget}
                onOpenChange={(open) => !open && setArchiveTarget(null)}
                title="Archive job?"
                description={archiveTarget ? `"${archiveTarget.title}" will be archived and removed from the careers page. You can publish it again later.` : undefined}
                confirmLabel="Archive"
                busy={archiving}
                onConfirm={confirmArchive}
            />
        </ListPageShell>
    );
}
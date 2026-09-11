'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ListPageShell } from '@/components/data/ListPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/recruitment/ConfirmDialog';
import {
    activitiesApi,
    candidatesApi,
    jobsApi,
    ACTIVITY_TYPES,
    formatDateTime,
    type ActivityItem,
    type CandidateItem,
    type JobItem,
} from '@/lib/recruitment';
import { adminApi, type UserListItem } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ListPageSkeleton } from '@/components/data/ListPageSkeleton';
import { toast } from 'sonner';
import { CalendarCheck2, CalendarClock, MoreVertical, Plus, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function typeBadge(type: string) {
    const colors: Record<string, string> = {
        interview: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
        call: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
        email: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
        task: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
        note: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        'follow-up': 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    };
    return (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[type] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
        </span>
    );
}

interface ActivityFormState {
    title: string;
    activity_type: string;
    description: string;
    candidate_id: string;
    job_id: string;
    assignee_id: string;
    due_date: string;
    is_done: boolean;
}

const EMPTY_FORM: ActivityFormState = {
    title: '',
    activity_type: 'interview',
    description: '',
    candidate_id: '',
    job_id: '',
    assignee_id: '',
    due_date: '',
    is_done: false,
};

export default function ActivitiesPage() {
    const { isAdminOrHR, isLoading: authLoading } = useAuth();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');

    const [candidates, setCandidates] = useState<CandidateItem[]>([]);
    const [jobs, setJobs] = useState<JobItem[]>([]);
    const [users, setUsers] = useState<UserListItem[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState<ActivityFormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ActivityItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await activitiesApi.list({
                is_done: filter === 'all' ? undefined : filter === 'done',
            });
            setActivities(res.items);
            setTotal(res.total);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load activities');
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        candidatesApi.list({ limit: 100 }).then((res) => setCandidates(res.items)).catch(() => {});
        jobsApi.list({ status: 'ACTIVE' }).then((res) => setJobs(res.items)).catch(() => {});
        adminApi.getAllUsers(0, 100).then((res) => setUsers(res.users)).catch(() => {});
    }, []);

    if (authLoading) return <ListPageSkeleton columns={6} />;

    if (!isAdminOrHR()) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <p className="text-muted-foreground">Only administrators can access Recruitment.</p>
            </div>
        );
    }

    const openCreate = () => {
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const save = async () => {
        if (!form.title.trim()) {
            toast.error('Activity title is required');
            return;
        }
        setSaving(true);
        try {
            await activitiesApi.create({
                title: form.title.trim(),
                activity_type: form.activity_type,
                description: form.description.trim() || null,
                candidate_id: form.candidate_id || null,
                job_id: form.job_id || null,
                assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
                due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
                is_done: form.is_done,
            });
            toast.success('Activity created');
            setModalOpen(false);
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create activity');
        } finally {
            setSaving(false);
        }
    };

    const toggleDone = async (activity: ActivityItem) => {
        try {
            const updated = await activitiesApi.update(activity.id, { is_done: !activity.is_done });
            setActivities(activities.map((a) => (a.id === activity.id ? updated : a)));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update activity');
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await activitiesApi.remove(deleteTarget.id);
            toast.success('Activity deleted');
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete activity');
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    const nativeSelectClass =
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

    return (
        <ListPageShell>
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-200/80 px-3 py-3 sm:px-4 dark:border-gray-800">
                <div className="flex items-center gap-1 rounded-lg border p-1">
                    {(['all', 'open', 'done'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                                filter === f ? 'bg-orange-600 text-white' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Done'}
                        </button>
                    ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <span className="hidden text-xs text-muted-foreground sm:inline">{total} activit{total === 1 ? 'y' : 'ies'}</span>
                    <Button onClick={openCreate}>
                        <Plus className="h-4 w-4" />
                        New Activity
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900">
                        <TableRow>
                            <TableHead>Activity</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="hidden md:table-cell">Candidate</TableHead>
                            <TableHead className="hidden lg:table-cell">Job</TableHead>
                            <TableHead>Due</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-12"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={7} className="h-14"><div className="h-4 w-52 animate-pulse rounded bg-gray-200 dark:bg-gray-800" /></TableCell>
                                </TableRow>
                            ))
                        ) : activities.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                                    No activities.
                                </TableCell>
                            </TableRow>
                        ) : (
                            activities.map((a) => (
                                <TableRow key={a.id} className={`hover:bg-accent/30 ${a.is_done ? 'opacity-60' : ''}`}>
                                    <TableCell>
                                        <div className={`font-medium ${a.is_done ? 'line-through' : ''}`}>{a.title}</div>
                                        {a.description && (
                                            <div className="max-w-[280px] truncate text-xs text-muted-foreground">{a.description}</div>
                                        )}
                                    </TableCell>
                                    <TableCell>{typeBadge(a.activity_type)}</TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        {a.candidate_id ? (
                                            <Link href={`/admin/candidates/${a.candidate_id}`} className="text-sm hover:text-orange-600">
                                                {a.candidate_name ?? `Candidate #${a.candidate_id}`}
                                            </Link>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        {a.job_id ? (
                                            <Link href={`/admin/jobs/${a.job_id}`} className="text-sm hover:text-orange-600">
                                                {a.job_title ?? `Job #${a.job_id}`}
                                            </Link>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`flex items-center gap-1.5 text-sm ${a.due_date && new Date(a.due_date) < new Date() && !a.is_done ? 'font-medium text-red-600' : 'text-muted-foreground'}`}>
                                            {a.due_date ? <CalendarClock className="h-3.5 w-3.5" /> : <CalendarCheck2 className="h-3.5 w-3.5 text-muted-foreground/50" />}
                                            {formatDateTime(a.due_date)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <button
                                            onClick={() => toggleDone(a)}
                                            disabled={loading}
                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                                                a.is_done
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950 dark:text-green-300'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                            }`}
                                        >
                                            <span className={`h-1.5 w-1.5 rounded-full ${a.is_done ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            {a.is_done ? 'Done' : 'Open'}
                                        </button>
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => toggleDone(a)}>
                                                    {a.is_done ? 'Mark open' : 'Mark done'}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(a)}>
                                                    <Trash2 className="h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden grid-rows-[auto_minmax(0,1fr)_auto]">
                    <DialogHeader>
                        <DialogTitle>New Activity</DialogTitle>
                        <DialogDescription>Schedule an interview or log an action.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 overflow-y-auto min-h-0 pr-1">
                        <div className="space-y-2">
                            <Label htmlFor="act-title">Title *</Label>
                            <Input
                                id="act-title"
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                placeholder="e.g. Client interview"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="act-type">Type</Label>
                                <select
                                    id="act-type"
                                    value={form.activity_type}
                                    onChange={(e) => setForm((f) => ({ ...f, activity_type: e.target.value }))}
                                    className={nativeSelectClass}
                                >
                                    {ACTIVITY_TYPES.map((t) => (
                                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="act-due">Due date</Label>
                                <Input
                                    id="act-due"
                                    type="datetime-local"
                                    value={form.due_date}
                                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="act-candidate">Candidate</Label>
                                <select
                                    id="act-candidate"
                                    value={form.candidate_id}
                                    onChange={(e) => setForm((f) => ({ ...f, candidate_id: e.target.value }))}
                                    className={nativeSelectClass}
                                >
                                    <option value="">—</option>
                                    {candidates.map((c) => (
                                        <option key={c.id} value={String(c.id)}>{c.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="act-job">Job</Label>
                                <select
                                    id="act-job"
                                    value={form.job_id}
                                    onChange={(e) => setForm((f) => ({ ...f, job_id: e.target.value }))}
                                    className={nativeSelectClass}
                                >
                                    <option value="">—</option>
                                    {jobs.map((j) => (
                                        <option key={j.id} value={String(j.id)}>{j.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="act-assignee">Assignee</Label>
                            <select
                                id="act-assignee"
                                value={form.assignee_id}
                                onChange={(e) => setForm((f) => ({ ...f, assignee_id: e.target.value }))}
                                className={nativeSelectClass}
                            >
                                <option value="">Unassigned</option>
                                {users.filter((u) => u.isActive).map((u) => (
                                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="act-desc">Notes</Label>
                            <Textarea
                                id="act-desc"
                                rows={3}
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button onClick={save} disabled={saving}>
                            {saving ? 'Saving…' : 'Create Activity'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Delete activity?"
                description={deleteTarget ? `"${deleteTarget.title}" will be removed.` : undefined}
                confirmLabel="Delete"
                destructive
                busy={deleting}
                onConfirm={confirmDelete}
            />
        </ListPageShell>
    );
}
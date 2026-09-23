'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    applicationsApi,
    activitiesApi,
    candidatesApi,
    fieldsApi,
    jobsApi,
    ACTIVITY_TYPES,
    formatDate,
    formatDateTime,
    formatSalary,
    initials,
    type ActivityItem,
    type ApplicationItem,
    type CandidateItem,
    type FieldDef,
    type JobItem,
    type Pipeline,
    type PipelineStage,
} from '@/lib/recruitment';
import { CustomFieldValues } from '@/components/recruitment/CustomFieldValues';
import { AiScoreBadge, AiScreeningPanel } from '@/components/recruitment/AiScore';
import { Markdown } from '@/components/ui/markdown';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/recruitment/ConfirmDialog';
import { JobFormContents } from '@/components/recruitment/JobFormContents';
import { DetailPageSkeleton } from '@/components/data/DetailPageSkeleton';
import { toast } from 'sonner';
import {
    Archive,
    ArrowUpRight,
    Briefcase,
    Calendar,
    ChevronDown,
    Eye,
    Globe,
    Loader2,
    MapPin,
    Pencil,
    Plus,
    Sparkles,
    Trash2,
    Users,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const UNASSIGNED_STAGE = '__unassigned__';
const ACTIVITIES_PAGE_SIZE = 10;

export default function JobDetailPage() {
    const params = useParams<{ id: string }>();
    const jobId = typeof params.id === 'string' ? params.id : '';
    const { isAdminOrHR, isLoading: authLoading } = useAuth();

    const [job, setJob] = useState<JobItem | null>(null);
    const [pipeline, setPipeline] = useState<Pipeline | null>(null);
    const [applications, setApplications] = useState<ApplicationItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [candidates, setCandidates] = useState<CandidateItem[]>([]);
    const [addStage, setAddStage] = useState<PipelineStage | null>(null);
    const [candidateSearch, setCandidateSearch] = useState('');
    const [adding, setAdding] = useState(false);

    const [newStageOpen, setNewStageOpen] = useState(false);
    const [newStageName, setNewStageName] = useState('');
    const [addingStage, setAddingStage] = useState(false);
    const [deleteStageTarget, setDeleteStageTarget] = useState<PipelineStage | null>(null);
    const [deletingStage, setDeletingStage] = useState(false);

    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [activityModal, setActivityModal] = useState(false);
    const [activitiesPage, setActivitiesPage] = useState(1);
    const [activitiesTotal, setActivitiesTotal] = useState(0);
    const [activityForm, setActivityForm] = useState({ title: '', activity_type: 'interview', description: '', due_date: '' });
    const [savingActivity, setSavingActivity] = useState(false);

    const [archiveConfirm, setArchiveConfirm] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const [jobDefs, setJobDefs] = useState<FieldDef[]>([]);
    const [editing, setEditing] = useState(false);

    const [openingResume, setOpeningResume] = useState(false);
    const [screeningId, setScreeningId] = useState<string | null>(null);
    const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

    const screenApplication = async (app: ApplicationItem) => {
        if (screeningId) return;
        setScreeningId(app.id);
        try {
            const res = await applicationsApi.aiScreen(app.id);
            setApplications((prev) => prev.map((a) => (a.id === app.id ? res.application : a)));
            setExpandedAppId(app.id);
            toast.success(`AI screening done${res.screening?.recommendation ? `: ${res.screening.recommendation}` : ''}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to screen application');
        } finally {
            setScreeningId(null);
        }
    };

    const openResume = async (app: ApplicationItem) => {
        if (openingResume) return;
        setOpeningResume(true);
        try {
            const blob = await applicationsApi.resume(app.id);
            const src = URL.createObjectURL(blob);
            window.open(src, '_blank', 'noopener,noreferrer');
            setTimeout(() => URL.revokeObjectURL(src), 60000);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load resume');
        } finally {
            setOpeningResume(false);
        }
    };

    useEffect(() => {
        fieldsApi.list({ entity: 'JOB' }).then((res) => setJobDefs(res.items)).catch(() => {});
    }, []);

    const load = useCallback(async () => {
        if (!jobId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [jobRes, pipelineRes, appsRes] = await Promise.all([
                jobsApi.get(jobId),
                jobsApi.getPipeline(jobId),
                applicationsApi.listByJob(jobId),
            ]);
            setJob(jobRes);
            setPipeline(pipelineRes);
            setApplications(appsRes.items);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load job');
        } finally {
            setLoading(false);
        }
    }, [jobId]);

    const loadActivities = useCallback(async (page: number = 1) => {
        if (!jobId) return;
        try {
            const res = await activitiesApi.list({ job_id: jobId, page, page_size: ACTIVITIES_PAGE_SIZE });
            setActivities(res.items);
            setActivitiesTotal(res.total);
            setActivitiesPage(page);
        } catch {
            /* non-fatal */
        }
    }, [jobId]);

    useEffect(() => {
        load();
        loadActivities();
        candidatesApi.list({ limit: 100 }).then((res) => setCandidates(res.items)).catch(() => {});
    }, [load, loadActivities]);

    const stages = useMemo(() => pipeline?.stages ?? [], [pipeline?.stages]);
    const appsByStage = useMemo(() => {
        const map: Record<string, ApplicationItem[]> = {};
        for (const s of stages) map[s.id] = [];
        for (const app of applications) {
            if (app.stage_id && map[app.stage_id]) {
                map[app.stage_id].push(app);
            } else {
                map[UNASSIGNED_STAGE] = map[UNASSIGNED_STAGE] ?? [];
                map[UNASSIGNED_STAGE].push(app);
            }
        }
        return map;
    }, [applications, stages]);
    const appliedCandidateIds = useMemo(() => new Set(applications.map((a) => a.candidate_id)), [applications]);
    const candidateOptions = candidates
        .filter((c) => !appliedCandidateIds.has(c.id))
        .filter((c) => {
            const q = candidateSearch.trim().toLowerCase();
            if (!q) return true;
            return c.full_name.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q) || (c.phone ?? '').includes(q);
        });

    if (authLoading || loading) {
        return <DetailPageSkeleton variant="job" />;
    }

    if (!isAdminOrHR() || !job) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <p className="text-muted-foreground">Job not found or you lack access.</p>
            </div>
        );
    }

    const moveApplication = async (appId: string, stageId: string) => {
        try {
            await applicationsApi.update(appId, { stage_id: stageId });
            const updated = applications.map((a) => (a.id === appId ? { ...a, stage_id: stageId } : a));
            setApplications(updated);
            toast.success('Application moved');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to move application');
        }
    };

    const removeApplication = async (app: ApplicationItem) => {
        try {
            await applicationsApi.remove(app.id);
            setApplications(applications.filter((a) => a.id !== app.id));
            toast.success('Application removed');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to remove application');
        }
    };

    const addCandidate = async (candidate: CandidateItem) => {
        if (!addStage || !job) return;
        setAdding(true);
        try {
            const created = await applicationsApi.create({
                candidate_id: candidate.id,
                job_id: job.id,
                stage_id: addStage.id,
            });
            setApplications((prev) => [...prev, created]);
            setAddStage(null);
            toast.success('Candidate added to pipeline');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to add candidate');
        } finally {
            setAdding(false);
        }
    };

    const addPipelineStage = async () => {
        const name = newStageName.trim();
        if (!name) {
            toast.error('Stage name is required');
            return;
        }
        setAddingStage(true);
        try {
            await jobsApi.addStage(jobId, name);
            setNewStageOpen(false);
            setNewStageName('');
            toast.success('Pipeline stage created');
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to add pipeline stage');
        } finally {
            setAddingStage(false);
        }
    };

    const removePipelineStage = async () => {
        if (!deleteStageTarget) return;
        setDeletingStage(true);
        try {
            const res = await jobsApi.removeStage(jobId, deleteStageTarget.id);
            toast.success(
                res.moved_candidates > 0
                    ? `Stage removed — ${res.moved_candidates} candidate(s) moved to Unassigned`
                    : 'Stage removed'
            );
            setDeleteStageTarget(null);
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to remove pipeline stage');
        } finally {
            setDeletingStage(false);
        }
    };

    const togglePublished = async () => {
        if (!job) return;
        try {
            const updated = await jobsApi.setPublished(job.id, !job.is_published);
            setJob(updated);
            toast.success(updated.is_published ? 'Job published' : 'Job unpublished');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update job');
        }
    };

const archiveJob = async () => {
        if (!job) return;
        setArchiving(true);
        try {
            const updated = await jobsApi.update(job.id, { status: 'ARCHIVED' });
            setJob(updated);
            toast.success('Job archived');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to archive job');
        } finally {
            setArchiving(false);
        }
    };

    const saveActivity = async () => {
        if (!activityForm.title.trim()) {
            toast.error('Activity title is required');
            return;
        }
        setSavingActivity(true);
        try {
            await activitiesApi.create({
                title: activityForm.title.trim(),
                activity_type: activityForm.activity_type,
                description: activityForm.description.trim() || null,
                job_id: job.id,
                due_date: activityForm.due_date ? new Date(activityForm.due_date).toISOString() : null,
            });
            loadActivities(1);
            setActivityModal(false);
            setActivityForm({ title: '', activity_type: 'interview', description: '', due_date: '' });
            toast.success('Activity created');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create activity');
        } finally {
            setSavingActivity(false);
        }
    };

    const toggleActivityDone = async (activity: ActivityItem) => {
        try {
            const updated = await activitiesApi.update(activity.id, { is_done: !activity.is_done });
            setActivities(activities.map((a) => (a.id === activity.id ? updated : a)));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update activity');
        }
    };

    const openCareers = () => {
        if (job.career_page_url) window.open(job.career_page_url, '_blank');
    };

    return (
        <div className="flex h-full w-full flex-col gap-4 overflow-y-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-xl font-bold">{job.title}</h1>
                        <Badge variant="secondary">{job.status}</Badge>
                        {job.is_published && <Badge>Published</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {job.organization_name && <span>{job.organization_name}</span>}
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location || (job.is_remote ? 'Remote' : '—')}</span>
                        {job.contract_type && <span>{job.contract_type}</span>}
                        <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.headcount} {job.headcount === 1 ? 'slot' : 'slots'}</span>
                        {job.tags && job.tags.length > 0 && (
                            <span className="flex items-center gap-1.5">
                                {job.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!editing && (
                        <Button variant="outline" size="sm" className="gap-1.5 text-sm font-medium" onClick={() => setEditing(true)}>
                            <Pencil className="h-4 w-4" /> Edit job
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 text-sm font-medium">
                                Actions
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={togglePublished} className="cursor-pointer">
                                <Globe className="h-4 w-4 mr-2" />
                                {job.is_published ? 'Unpublish' : 'Publish'}
                            </DropdownMenuItem>
                            {job.is_published && job.career_page_url && (
                                <DropdownMenuItem onClick={openCareers} className="cursor-pointer">
                                    <Globe className="h-4 w-4 mr-2" /> View careers page
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setArchiveConfirm(true)}
                                className="cursor-pointer"
                            >
                                <Archive className="h-4 w-4 mr-2" /> Archive job
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Meta card */}
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" /> Candidates in pipeline
                    </div>
                    <div className="mt-1 text-2xl font-bold">{applications.length}</div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" /> Posted
                    </div>
                    <div className="mt-1 text-sm font-medium">{formatDate(job.created_at)}</div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Briefcase className="h-4 w-4" /> Salary
                    </div>
                    <div className="mt-1 text-sm font-medium">{formatSalary(job)}</div>
                </div>
            </div>

            {editing ? (
                <div className="rounded-lg border bg-card p-4">
                    <h3 className="mb-3 text-sm font-semibold">Editing job</h3>
                    <JobFormContents
                        job={job}
                        onCancel={() => setEditing(false)}
                        onSaved={() => {
                            setEditing(false);
                            load();
                        }}
                    />
                </div>
            ) : (
                <>
                    {job.description && (
                        <div className="rounded-lg border bg-card p-4">
                            <h3 className="mb-2 text-sm font-semibold">Description</h3>
                            <div className="text-sm text-muted-foreground">
                                <Markdown>{job.description}</Markdown>
                            </div>
                        </div>
                    )}

                    {job.custom_fields && Object.keys(job.custom_fields).length > 0 && (
                        <div className="rounded-lg border bg-card p-4">
                            <h3 className="mb-3 text-sm font-semibold">Additional details</h3>
                            <CustomFieldValues defs={jobDefs} values={job.custom_fields} />
                        </div>
                    )}
                </>
            )}

            {/* Pipeline kanban */}
            <div>
                <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Pipeline — {pipeline?.pipeline_name ?? 'Default'}</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{stages.length} stages</span>
                        <Button variant="outline" size="sm" onClick={() => setNewStageOpen(true)}>
                            <Plus className="h-4 w-4" /> Add stage
                        </Button>
                    </div>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-4">
                    {[...stages.map((s) => s.id), UNASSIGNED_STAGE].map((stageId) => {
                        const stage = stages.find((s) => s.id === stageId);
                        const appList = appsByStage[stageId] ?? [];
                        if (stageId === UNASSIGNED_STAGE && appList.length === 0) return null;
                        return (
                            <div key={stageId} className="flex w-64 shrink-0 flex-col rounded-lg border bg-gray-50/70 dark:bg-gray-900/40">
                                <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-gray-50 px-3 py-2.5 dark:bg-gray-900">
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2 w-2 rounded-full ${stage ? 'bg-orange-500' : 'bg-gray-400'}`} />
                                        <span className="text-sm font-medium">{stage?.name ?? 'Unassigned'}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                            {appList.length}
                                        </span>
                                        {stage && (
                                            <button
                                                onClick={() => setDeleteStageTarget(stage)}
                                                className="text-muted-foreground hover:text-red-500"
                                                title="Remove stage"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex min-h-0 max-h-[60vh] flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-2">
                                    {appList.length === 0 && (
                                        <p className="py-4 text-center text-xs text-muted-foreground">No candidates</p>
                                    )}
                                    {appList.map((app) => (
                                        <div key={app.id} className="rounded-md border bg-white p-3 shadow-sm dark:bg-gray-950">
                                            <div className="flex items-start justify-between gap-2">
                                                <Link href={`/admin/candidates/${app.candidate_id}`} className="flex items-center gap-2 min-w-0">
                                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                                                        {initials(app.candidate_name ?? '?')}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-medium">{app.candidate_name ?? 'Candidate'}</div>
                                                        {app.candidate_reference && (
                                                            <div className="text-[11px] text-muted-foreground">{app.candidate_reference}</div>
                                                        )}
                                                    </div>
                                                </Link>
                                                <div className="flex items-center gap-1">
                                                    {app.has_resume && !app.ai_screening && (
                                                        <button
                                                            onClick={() => screenApplication(app)}
                                                            disabled={screeningId === app.id}
                                                            className="text-muted-foreground hover:text-orange-600"
                                                            title="Screen with AI"
                                                        >
                                                            {screeningId === app.id ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <Sparkles className="h-3.5 w-3.5" />
                                                            )}
                                                        </button>
                                                    )}
                                                    {app.has_resume && (
                                                        <button onClick={() => openResume(app)} className="text-muted-foreground hover:text-orange-600" title="View resume">
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => removeApplication(app)} className="text-muted-foreground hover:text-red-500" title="Remove from pipeline">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            {(app.candidate_email || app.candidate_phone) && (
                                                <div className="mt-1.5 truncate text-xs text-muted-foreground">
                                                    {app.candidate_email ?? app.candidate_phone}
                                                </div>
                                            )}
                                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                                {app.ai_screening ? (
                                                    <AiScoreBadge score={app.ai_screening.score} />
                                                ) : (
                                                    app.match_score != null && <span>Match {app.match_score}%</span>
                                                )}
                                                {app.source && <span>{app.source}</span>}
                                                <span>{formatDate(app.created_at)}</span>
                                            </div>
                                            {expandedAppId === app.id && app.ai_screening && (
                                                <div className="mt-2">
                                                    <AiScreeningPanel screening={app.ai_screening} />
                                                </div>
                                            )}
                                            {app.ai_screening && (
                                                <button
                                                    onClick={() => setExpandedAppId(expandedAppId === app.id ? null : app.id)}
                                                    className="mt-1.5 text-[11px] font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400"
                                                >
                                                    {expandedAppId === app.id ? 'Hide AI summary' : 'Show AI summary'}
                                                </button>
                                            )}
                                            {stage && stage.id != null && (
                                                <div className="mt-2">
                                                    <Select
                                                        value={app.stage_id ?? ''}
                                                        onValueChange={(v) => moveApplication(app.id, v)}
                                                    >
                                                        <SelectTrigger size="sm" className="w-full">
                                                            <SelectValue placeholder="Move to…" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {stages.map((s) => (
                                                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {stage && (
                                        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setAddStage(stage)}>
                                            <Plus className="h-4 w-4" /> Add candidate
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Activities */}
            <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Activities</h2>
                    <Button variant="outline" size="sm" onClick={() => setActivityModal(true)}>
                        <Plus className="h-4 w-4" /> New activity
                    </Button>
                </div>
                {activities.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No activities for this job yet.
                    </p>
                ) : (
                    <div className="divide-y rounded-lg border bg-card">
                        {activities.map((a) => (
                            <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => toggleActivityDone(a)}
                                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                            a.is_done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                        title={a.is_done ? 'Mark as open' : 'Mark as done'}
                                    >
                                        {a.is_done ? '✓' : ''}
                                    </button>
                                    <div>
                                        <div className={`text-sm font-medium ${a.is_done ? 'line-through text-muted-foreground' : ''}`}>
                                            {a.title}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            <span className="capitalize">{a.activity_type}</span>
                                            {a.candidate_name ? ` · ${a.candidate_name}` : ''}
                                            {a.due_date ? ` · due ${formatDateTime(a.due_date)}` : ''}
                                        </div>
                                    </div>
                                </div>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                    {formatDate(a.created_at)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                {activitiesTotal > ACTIVITIES_PAGE_SIZE && (
                    <div className="mt-2 flex items-center justify-between rounded-lg border bg-card px-4 py-2 text-sm text-muted-foreground">
                        <span>
                            {Math.min((activitiesPage - 1) * ACTIVITIES_PAGE_SIZE + 1, activitiesTotal)}–
                            {Math.min(activitiesPage * ACTIVITIES_PAGE_SIZE, activitiesTotal)} of {activitiesTotal}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled={activitiesPage <= 1} onClick={() => loadActivities(activitiesPage - 1)}>
                                Previous
                            </Button>
                            <Button variant="outline" size="sm" disabled={activitiesPage * ACTIVITIES_PAGE_SIZE >= activitiesTotal} onClick={() => loadActivities(activitiesPage + 1)}>
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add candidate dialog */}
            <Dialog open={!!addStage} onOpenChange={(open) => !open && setAddStage(null)}>
                <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden grid-rows-[auto_minmax(0,1fr)_auto]">
                    <DialogHeader>
                        <DialogTitle>Add candidate to {addStage?.name}</DialogTitle>
                        <DialogDescription>Pick a candidate to place in this pipeline stage.</DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 space-y-2 overflow-y-auto">
                    <Input
                        placeholder="Search candidates…"
                        value={candidateSearch}
                        onChange={(e) => setCandidateSearch(e.target.value)}
                        className="mb-2 sticky top-0 bg-background"
                    />
                    <div className="space-y-1">
                        {candidateOptions.length === 0 && (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                {candidates.length === 0 ? 'No candidates yet. Create one first.' : 'No matching candidates.'}
                            </p>
                        )}
                        {candidateOptions.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => addCandidate(c)}
                                disabled={adding}
                                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-accent"
                            >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                                    {initials(c.full_name)}
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium">{c.full_name}</div>
                                    <div className="truncate text-xs text-muted-foreground">
                                        {c.current_position ?? ''}{c.current_company ? ` @ ${c.current_company}` : ''}{c.email ? ` · ${c.email}` : ''}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddStage(null)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* New activity dialog */}
            <Dialog open={activityModal} onOpenChange={setActivityModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>New activity</DialogTitle>
                        <DialogDescription>Schedule or log an activity for this job.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="act-title">Title *</Label>
                            <Input
                                id="act-title"
                                value={activityForm.title}
                                onChange={(e) => setActivityForm((f) => ({ ...f, title: e.target.value }))}
                                placeholder="e.g. Client interview — round 1"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="act-type">Type</Label>
                                <select
                                    id="act-type"
                                    value={activityForm.activity_type}
                                    onChange={(e) => setActivityForm((f) => ({ ...f, activity_type: e.target.value }))}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
                                    value={activityForm.due_date}
                                    onChange={(e) => setActivityForm((f) => ({ ...f, due_date: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="act-desc">Notes</Label>
                            <Textarea
                                id="act-desc"
                                rows={3}
                                value={activityForm.description}
                                onChange={(e) => setActivityForm((f) => ({ ...f, description: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActivityModal(false)}>Cancel</Button>
                        <Button onClick={saveActivity} disabled={savingActivity}>
                            {savingActivity ? 'Saving…' : 'Create activity'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add pipeline stage dialog */}
            <Dialog open={newStageOpen} onOpenChange={setNewStageOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add pipeline stage</DialogTitle>
                        <DialogDescription>Create a new stage for this job&apos;s pipeline.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="stage-name">Stage name</Label>
                        <Input
                            id="stage-name"
                            value={newStageName}
                            onChange={(e) => setNewStageName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !addingStage && addPipelineStage()}
                            placeholder="e.g. Phone screen"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewStageOpen(false)}>Cancel</Button>
                        <Button onClick={addPipelineStage} disabled={addingStage || !newStageName.trim()}>
                            {addingStage ? 'Adding…' : 'Add stage'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete stage dialog */}
            <ConfirmDialog
                open={!!deleteStageTarget}
                onOpenChange={(open) => !open && setDeleteStageTarget(null)}
                title="Remove pipeline stage?"
                description={`"${deleteStageTarget?.name ?? ''}" will be removed. Any candidates in this stage will be moved to Unassigned (their applications are kept).`}
                confirmLabel="Remove"
                busy={deletingStage}
                onConfirm={removePipelineStage}
            />

            <ConfirmDialog
                open={archiveConfirm}
                onOpenChange={setArchiveConfirm}
                title="Archive job?"
                description={`"${job.title}" will be archived and removed from the careers page. Existing data is kept and you can publish it again later.`}
                confirmLabel="Archive"
                busy={archiving}
                onConfirm={archiveJob}
            />
        </div>
    );
}
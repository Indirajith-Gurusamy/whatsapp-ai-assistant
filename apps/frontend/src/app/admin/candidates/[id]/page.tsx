'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    activitiesApi,
    applicationsApi,
    candidatesApi,
    fieldsApi,
    jobsApi,
    ACTIVITY_TYPES,
    formatDate,
    formatDateTime,
    initials,
    type ActivityItem,
    type ApplicationItem,
    type CandidateItem,
    type FieldDef,
    type JobItem,
    type LogItem,
    type NoteItem,
} from '@/lib/recruitment';
import { CustomFieldValues } from '@/components/recruitment/CustomFieldValues';
import { AiScoreBadge, AiScreeningPanel } from '@/components/recruitment/AiScore';
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
import { ConfirmDialog } from '@/components/recruitment/ConfirmDialog';
import { DetailPageSkeleton } from '@/components/data/DetailPageSkeleton';
import { toast } from 'sonner';
import {
    Briefcase,
    Calendar,
    ChevronDown,
    Download,
    FileText,
    Linkedin,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Plus,
    Sparkles,
    Trash2,
    Users,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Pipeline } from '@/lib/recruitment';

export default function CandidateDetailPage() {
    const params = useParams<{ id: string }>();
    const candidateId = typeof params.id === 'string' ? params.id : '';
    const { isAdminOrHR, isLoading: authLoading } = useAuth();

    const [candidate, setCandidate] = useState<CandidateItem | null>(null);
    const [applications, setApplications] = useState<ApplicationItem[]>([]);
    const [notes, setNotes] = useState<NoteItem[]>([]);
    const [logs, setLogs] = useState<LogItem[]>([]);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [jobs, setJobs] = useState<JobItem[]>([]);
    const [candidateDefs, setCandidateDefs] = useState<FieldDef[]>([]);
    const [loading, setLoading] = useState(true);

    const [noteText, setNoteText] = useState('');
    const [addingNote, setAddingNote] = useState(false);

    const [addAppOpen, setAddAppOpen] = useState(false);
    const [addingApp, setAddingApp] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState('');

    const [moveTarget, setMoveTarget] = useState<ApplicationItem | null>(null);
    const [movePipeline, setMovePipeline] = useState<Pipeline | null>(null);
    const [moving, setMoving] = useState(false);

    const [activityModal, setActivityModal] = useState(false);
    const [activityForm, setActivityForm] = useState({ title: '', activity_type: 'interview', description: '', due_date: '' });
    const [savingActivity, setSavingActivity] = useState(false);

    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [parsingResume, setParsingResume] = useState(false);
    const [screeningId, setScreeningId] = useState<string | null>(null);
    const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

    const parseResume = async () => {
        if (parsingResume) return;
        setParsingResume(true);
        try {
            const res = await candidatesApi.aiParse(candidateId);
            setCandidate((c) => (c ? { ...c, ...res.candidate } : c));
            toast.success(`AI parsed ${res.candidate.full_name}'s resume`);
            setExpandedAppId(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to parse resume');
        } finally {
            setParsingResume(false);
        }
    };

    const screenApplication = async (app: ApplicationItem) => {
        if (screeningId) return;
        setScreeningId(app.id);
        try {
            const res = await applicationsApi.aiScreen(app.id);
            setApplications((prev) => prev.map((a) => (a.id === app.id ? res.application : a)));
            setExpandedAppId(app.id);
            const rec = res.screening?.recommendation;
            toast.success(`AI screening done${rec ? `: ${rec}` : ''}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to screen application');
        } finally {
            setScreeningId(null);
        }
    };

    const load = useCallback(async () => {
        if (!candidateId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [candRes, appsRes, notesRes, logsRes, activitiesRes, jobsRes] = await Promise.all([
                candidatesApi.get(candidateId),
                applicationsApi.listByCandidate(candidateId),
                candidatesApi.notes(candidateId),
                candidatesApi.logs(candidateId),
                activitiesApi.list({ candidate_id: candidateId }),
                jobsApi.list({ status: 'ACTIVE' }),
            ]);
            setCandidate(candRes);
            setApplications(appsRes.items);
            setNotes(notesRes);
            setLogs(logsRes);
            setActivities(activitiesRes.items);
            setJobs(jobsRes.items);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load candidate');
        } finally {
            setLoading(false);
        }
    }, [candidateId]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        fieldsApi.list({ entity: 'CANDIDATE' }).then((res) => setCandidateDefs(res.items)).catch(() => {});
    }, []);

    const [openingResume, setOpeningResume] = useState(false);
    const [resumeModal, setResumeModal] = useState(false);
    const [resumeSrc, setResumeSrc] = useState<string | null>(null);
    const openResume = async () => {
        if (openingResume) return;
        setOpeningResume(true);
        try {
            const blob = await candidatesApi.resume(candidateId);
            const src = URL.createObjectURL(blob);
            setResumeSrc(src);
            setResumeModal(true);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load resume');
        } finally {
            setOpeningResume(false);
        }
    };
    const closeResume = () => {
        setResumeModal(false);
        if (resumeSrc) {
            URL.revokeObjectURL(resumeSrc);
            setResumeSrc(null);
        }
    };

    const addNote = async () => {
        if (!noteText.trim()) return;
        setAddingNote(true);
        try {
            const created = await candidatesApi.addNote(candidateId, noteText.trim());
            setNotes((prev) => [created, ...prev]);
            setNoteText('');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to add note');
        } finally {
            setAddingNote(false);
        }
    };

    const deleteNote = async (noteId: string) => {
        try {
            await candidatesApi.deleteNote(noteId);
            setNotes(notes.filter((n) => n.id !== noteId));
            toast.success('Note deleted');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete note');
        }
    };

    const appliedJobIds = useMemo(() => new Set(applications.map((a) => a.job_id)), [applications]);
    const availableJobs = jobs.filter((j) => !appliedJobIds.has(j.id));

    const addApplication = async () => {
        if (!selectedJobId) {
            toast.error('Select a job');
            return;
        }
        setAddingApp(true);
        try {
            const created = await applicationsApi.create({
                candidate_id: candidateId,
                job_id: selectedJobId,
            });
            setApplications((prev) => [created, ...prev]);
            setAddAppOpen(false);
            setSelectedJobId('');
            toast.success('Application created');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create application');
        } finally {
            setAddingApp(false);
        }
    };

    const openMove = async (app: ApplicationItem) => {
        setMoveTarget(app);
        setMovePipeline(null);
        try {
            const pipeline = await jobsApi.getPipeline(app.job_id);
            setMovePipeline(pipeline);
        } catch {
            /* pipeline may fail for deleted jobs — move still works for existing stages list below */
        }
    };

    const moveApplication = async (stageId: string) => {
        if (!moveTarget) return;
        setMoving(true);
        try {
            const updated = await applicationsApi.update(moveTarget.id, { stage_id: stageId });
            setApplications(applications.map((a) => (a.id === moveTarget.id ? updated : a)));
            setMoveTarget(null);
            toast.success('Application moved');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to move application');
        } finally {
            setMoving(false);
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

    const saveActivity = async () => {
        if (!activityForm.title.trim()) {
            toast.error('Activity title is required');
            return;
        }
        setSavingActivity(true);
        try {
            const created = await activitiesApi.create({
                title: activityForm.title.trim(),
                activity_type: activityForm.activity_type,
                description: activityForm.description.trim() || null,
                candidate_id: candidateId,
                due_date: activityForm.due_date ? new Date(activityForm.due_date).toISOString() : null,
            });
            setActivities((prev) => [created, ...prev]);
            setActivityModal(false);
            setActivityForm({ title: '', activity_type: 'interview', description: '', due_date: '' });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create activity');
        } finally {
            setSavingActivity(false);
        }
    };

    const deleteCandidate = async () => {
        setDeleting(true);
        try {
            await candidatesApi.remove(candidateId);
            toast.success('Candidate deleted');
            window.location.href = '/admin/candidates';
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete candidate');
            setDeleting(false);
        }
    };

    if (authLoading || loading) {
        return <DetailPageSkeleton variant="candidate" />;
    }

    if (!isAdminOrHR() || !candidate) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <p className="text-muted-foreground">Candidate not found or you lack access.</p>
            </div>
        );
    }

    const salaryText = (s: Record<string, unknown> | null) => {
        if (!s) return null;
        const raw = JSON.stringify(s);
        const clean = raw.replace(/[{}"]/g, '');
        return clean || null;
    };

    return (
        <div className="flex h-full w-full flex-col gap-4 overflow-y-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                        {initials(candidate.full_name)}
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-bold">{candidate.full_name}</h1>
                            {candidate.source && <Badge variant="secondary">{candidate.source}</Badge>}
                            {candidate.best_match_score != null && (
                                <AiScoreBadge score={candidate.best_match_score} />
                            )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {candidate.reference} · added {formatDate(candidate.created_at)}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {candidate.resume_url && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="gap-1.5 text-sm font-medium"
                            onClick={parseResume}
                            disabled={parsingResume}
                            title="Extract profile details with AI"
                        >
                            {parsingResume ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            {parsingResume ? 'Parsing…' : 'Parse with AI'}
                        </Button>
                    )}
                    {candidate.resume_url && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="gap-1.5 text-sm font-medium"
                            onClick={openResume}
                            disabled={openingResume}
                        >
                            {openingResume ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                            Resume
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
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteConfirm(true)}
                                className="cursor-pointer"
                            >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete candidate
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Overview grid */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Profile card */}
                <div className="rounded-lg border bg-card p-4 lg:col-span-2">
                    <h3 className="mb-3 text-sm font-semibold">Profile</h3>
                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        {candidate.email && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-4 w-4 shrink-0" /> <a href={`mailto:${candidate.email}`} className="text-foreground hover:text-orange-600">{candidate.email}</a>
                            </div>
                        )}
                        {candidate.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4 shrink-0" /> {candidate.phone}
                            </div>
                        )}
                        {candidate.location && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-4 w-4 shrink-0" /> {candidate.location}
                            </div>
                        )}
                        {candidate.linkedin_url && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Linkedin className="h-4 w-4 shrink-0" />
                                <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="text-foreground hover:text-orange-600">LinkedIn</a>
                            </div>
                        )}
                        {candidate.current_position && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Briefcase className="h-4 w-4 shrink-0" />
                                {candidate.current_position}{candidate.current_company ? ` @ ${candidate.current_company}` : ''}
                            </div>
                        )}
                        {candidate.experience && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4 shrink-0" /> {candidate.experience}
                            </div>
                        )}
                        {candidate.notice_period && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4 shrink-0" /> Notice: {candidate.notice_period}
                            </div>
                        )}
                        {salaryText(candidate.expected_salary) && (
                            <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                                <Briefcase className="h-4 w-4 shrink-0" /> Expected salary: {salaryText(candidate.expected_salary)}
                            </div>
                        )}
                    </div>
                    {(candidate.skills ?? []).length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                            {candidate.skills!.map((s) => (
                                <Badge key={s} variant="outline">{s}</Badge>
                            ))}
                        </div>
                    )}
                    {candidate.description && (
                        <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{candidate.description}</p>
                    )}
                    {(candidate.custom_fields && Object.keys(candidate.custom_fields).length > 0) && (
                        <div className="mt-4 border-t pt-4">
                            <CustomFieldValues defs={candidateDefs} values={candidate.custom_fields} />
                        </div>
                    )}
                </div>

                {/* Logs */}
                <div className="rounded-lg border bg-card p-4">
                    <h3 className="mb-3 text-sm font-semibold">Activity log</h3>
                    {logs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No activity yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {logs.slice(0, 12).map((log) => (
                                <div key={log.id} className="flex gap-2">
                                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                                    <div className="min-w-0">
                                        <div className="text-xs text-muted-foreground">{log.action}</div>
                                        <div className="text-[11px] text-muted-foreground/70">
                                            {log.actor_name ?? 'System'} · {formatDateTime(log.created_at)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Applications */}
            <div>
                <div className="mb-2 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                        <Users className="h-4 w-4" /> Applications
                    </h2>
                    <Button variant="outline" size="sm" onClick={() => setAddAppOpen(true)}>
                        <Plus className="h-4 w-4" /> Add to job
                    </Button>
                </div>
                {applications.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No applications yet.
                    </p>
                ) : (
                    <div className="divide-y rounded-lg border bg-card">
                        {applications.map((app) => (
                            <div key={app.id}>
                                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Link href={`/admin/jobs/${app.job_id}`} className="text-sm font-medium hover:text-orange-600">
                                                {app.job_title ?? `Job #${app.job_id}`}
                                            </Link>
                                            {app.ai_screening && <AiScoreBadge score={app.ai_screening.score} />}
                                        </div>
                                        {app.organization_name && (
                                            <span className="ml-1 text-xs text-muted-foreground">{app.organization_name}</span>
                                        )}
                                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{app.stage_name ?? 'Unassigned'}</span>
                                            {app.match_score != null && <span>· Match {app.match_score}%</span>}
                                            <span>· {app.source ?? 'Manual'}</span>
                                            <span>· {formatDate(app.created_at)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {app.ai_screening ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setExpandedAppId(expandedAppId === app.id ? null : app.id)}
                                                className="gap-1.5"
                                            >
                                                <Sparkles className="h-4 w-4" />
                                                {expandedAppId === app.id ? 'Hide summary' : 'AI summary'}
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5"
                                                onClick={() => screenApplication(app)}
                                                disabled={screeningId === app.id || !!screeningId}
                                            >
                                                {screeningId === app.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Sparkles className="h-4 w-4" />
                                                )}
                                                {screeningId === app.id ? 'Screening…' : 'Screen with AI'}
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" onClick={() => openMove(app)}>
                                            Move stage
                                        </Button>
                                    </div>
                                </div>
                                {expandedAppId === app.id && app.ai_screening && (
                                    <div className="px-4 pb-4">
                                        <AiScreeningPanel screening={app.ai_screening} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Notes + Activities */}
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border bg-card p-4">
                    <h3 className="mb-3 text-sm font-semibold">Notes</h3>
                    <div className="mb-3 flex gap-2">
                        <Input
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addNote()}
                            placeholder="Add a note and press Enter…"
                        />
                        <Button onClick={addNote} disabled={addingNote || !noteText.trim()}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    {notes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No notes.</p>
                    ) : (
                        <div className="space-y-2">
                            {notes.map((n) => (
                                <div key={n.id} className="flex items-start justify-between gap-2 rounded-md bg-gray-50 p-3 dark:bg-gray-900/50">
                                    <div className="min-w-0">
                                        <p className="whitespace-pre-wrap text-sm">{n.content}</p>
                                        <p className="mt-1 text-[11px] text-muted-foreground">
                                            {n.author_name ?? 'Unknown'} · {formatDateTime(n.created_at)}
                                        </p>
                                    </div>
                                    <button onClick={() => deleteNote(n.id)} className="shrink-0 text-muted-foreground hover:text-red-500">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-lg border bg-card p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Activities</h3>
                        <Button variant="outline" size="sm" onClick={() => setActivityModal(true)}>
                            <Plus className="h-4 w-4" /> New
                        </Button>
                    </div>
                    {activities.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No activities.</p>
                    ) : (
                        <div className="space-y-2">
                            {activities.map((a) => (
                                <div key={a.id} className="flex items-center justify-between gap-2 rounded-md bg-gray-50 p-3 dark:bg-gray-900/50">
                                    <button
                                        onClick={() => toggleActivityDone(a)}
                                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                            a.is_done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    >
                                        {a.is_done ? '✓' : ''}
                                    </button>
                                    <div className="min-w-0 flex-1">
                                        <div className={`truncate text-sm font-medium ${a.is_done ? 'line-through text-muted-foreground' : ''}`}>
                                            {a.title}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            <span className="capitalize">{a.activity_type}</span>
                                            {a.job_title ? ` · ${a.job_title}` : ''}
                                            {a.due_date ? ` · due ${formatDateTime(a.due_date)}` : ''}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add to job dialog */}
            <Dialog open={addAppOpen} onOpenChange={setAddAppOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add to job</DialogTitle>
                        <DialogDescription>Place this candidate in a job pipeline.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="app-job">Job</Label>
                        {availableJobs.length === 0 ? (
                            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                                No active jobs available for this candidate.
                            </p>
                        ) : (
                            <select
                                id="app-job"
                                value={selectedJobId}
                                onChange={(e) => setSelectedJobId(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                <option value="">Select a job…</option>
                                {availableJobs.map((j) => (
                                    <option key={j.id} value={String(j.id)}>{j.title}{j.organization_name ? ` (${j.organization_name})` : ''}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddAppOpen(false)}>Cancel</Button>
                        <Button onClick={addApplication} disabled={addingApp || !selectedJobId}>
                            {addingApp ? 'Adding…' : 'Add'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Move stage dialog */}
            <Dialog open={!!moveTarget} onOpenChange={(open) => !open && setMoveTarget(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Move application</DialogTitle>
                        <DialogDescription>
                            {moveTarget ? `${moveTarget.candidate_name ?? 'Candidate'} → ${moveTarget.job_title ?? 'Job'}` : ''}
                        </DialogDescription>
                    </DialogHeader>
                    {!movePipeline && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                    {movePipeline && (
                        <div className="space-y-1">
                            {movePipeline.stages.map((s) => (
                                <button
                                    key={s.id}
                                    disabled={moving || s.id === moveTarget?.stage_id}
                                    onClick={() => moveApplication(s.id)}
                                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                                >
                                    <span>{s.name}</span>
                                    {s.id === moveTarget?.stage_id && <span className="text-xs text-muted-foreground">Current</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* New activity dialog */}
            <Dialog open={activityModal} onOpenChange={setActivityModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>New activity</DialogTitle>
                        <DialogDescription>Schedule or log an activity for this candidate.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="act-title">Title *</Label>
                            <Input
                                id="act-title"
                                value={activityForm.title}
                                onChange={(e) => setActivityForm((f) => ({ ...f, title: e.target.value }))}
                                placeholder="e.g. Interview with hiring manager"
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

            {/* Resume dialog */}
            <Dialog open={resumeModal} onOpenChange={(open) => !open && closeResume()}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle className="truncate pr-4">
                            Resume{candidate.resume_file_name ? ` — ${candidate.resume_file_name}` : ''}
                        </DialogTitle>
                        <DialogDescription>Preview of the candidate resume.</DialogDescription>
                    </DialogHeader>
                    {resumeSrc ? (
                        <iframe
                            src={resumeSrc}
                            title="Resume"
                            className="h-[70vh] w-full rounded-md border"
                        />
                    ) : (
                        <div className="flex h-[70vh] items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" /> Loading resume…
                        </div>
                    )}
                    <DialogFooter>
                        {resumeSrc && (
                            <a href={resumeSrc} download={candidate.resume_file_name ?? 'resume.pdf'}>
                                <Button variant="outline" className="gap-1.5">
                                    <Download className="h-4 w-4" /> Download
                                </Button>
                            </a>
                        )}
                        <Button onClick={closeResume}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteConfirm}
                onOpenChange={setDeleteConfirm}
                title="Delete candidate?"
                description={`${candidate.full_name} will be permanently removed along with their applications.`}
                confirmLabel="Delete"
                destructive
                busy={deleting}
                onConfirm={deleteCandidate}
            />
        </div>
    );
}
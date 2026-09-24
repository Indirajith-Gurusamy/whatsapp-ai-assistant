'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { ConfirmDialog } from '@/components/recruitment/ConfirmDialog';
import { CustomFieldRow } from '@/components/recruitment/CustomFieldControls';
import {
    candidatesApi,
    fieldsApi,
    CANDIDATE_SOURCES,
    formatDate,
    initials,
    type CandidateItem,
    type FieldDef,
} from '@/lib/recruitment';
import { useAuth } from '@/contexts/AuthContext';
import { ListPageSkeleton } from '@/components/data/ListPageSkeleton';
import { DataTable } from '@/components/data/DataTable';
import { toast } from 'sonner';
import { FileArchive, FileSpreadsheet, FileText, Download, Loader2, MoreVertical, Pencil, Trash2, UserRound } from 'lucide-react';
import { AiScoreBadge } from '@/components/recruitment/AiScore';
import {
    toolbarInlineActionBtn,
    ToolbarActionLabel,
} from '@/components/data/ListPageToolbar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CandidateFormState {
    full_name: string;
    email: string;
    phone: string;
    location: string;
    current_company: string;
    current_position: string;
    experience: string;
    notice_period: string;
    linkedin_url: string;
    source: string;
    skills: string;
    description: string;
}

const EMPTY_FORM: CandidateFormState = {
    full_name: '',
    email: '',
    phone: '',
    location: '',
    current_company: '',
    current_position: '',
    experience: '',
    notice_period: '',
    linkedin_url: '',
    source: '',
    skills: '',
    description: '',
};

function candidateToForm(c: CandidateItem): CandidateFormState {
    return {
        full_name: c.full_name,
        email: c.email ?? '',
        phone: c.phone ?? '',
        location: c.location ?? '',
        current_company: c.current_company ?? '',
        current_position: c.current_position ?? '',
        experience: c.experience ?? '',
        notice_period: c.notice_period ?? '',
        linkedin_url: c.linkedin_url ?? '',
        source: c.source ?? '',
        skills: (c.skills ?? []).join(', '),
        description: c.description ?? '',
    };
}

export default function CandidatesPage() {
    const { isAdminOrHR, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [candidates, setCandidates] = useState<CandidateItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<CandidateItem | null>(null);
    const [form, setForm] = useState<CandidateFormState>(EMPTY_FORM);
    const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
    const [candidateDefs, setCandidateDefs] = useState<FieldDef[]>([]);
    const [defsLoading, setDefsLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<CandidateItem | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [zipping, setZipping] = useState(false);

    useEffect(() => {
        fieldsApi.list({ entity: 'CANDIDATE', include_deleted: true })
            .then((res) => setCandidateDefs(res.items))
            .catch(() => {})
            .finally(() => setDefsLoading(false));
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await candidatesApi.list({ limit: 500 });
            setCandidates(res.items);
            setTotal(res.total);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load candidates');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

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
        setForm(EMPTY_FORM);
        setCustomFields({});
        setModalOpen(true);
    };

    const openEdit = (c: CandidateItem) => {
        setEditing(c);
        setForm(candidateToForm(c));
        setCustomFields(c.custom_fields ?? {});
        setModalOpen(true);
    };

    const save = async () => {
        if (!form.full_name.trim()) {
            toast.error('Candidate name is required');
            return;
        }
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                full_name: form.full_name.trim(),
                email: form.email.trim() || null,
                phone: form.phone.trim() || null,
                location: form.location.trim() || null,
                current_company: form.current_company.trim() || null,
                current_position: form.current_position.trim() || null,
                experience: form.experience.trim() || null,
                notice_period: form.notice_period.trim() || null,
                linkedin_url: form.linkedin_url.trim() || null,
                source: form.source || null,
                skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean) || null,
                description: form.description.trim() || null,
            };
            if (editing) {
                payload.custom_fields = customFields;
                await candidatesApi.update(editing.id, payload);
                toast.success('Candidate updated');
            } else {
                if (Object.keys(customFields).length > 0) payload.custom_fields = customFields;
                await candidatesApi.create(payload);
                toast.success('Candidate created');
            }
            setModalOpen(false);
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save candidate');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await candidatesApi.remove(deleteTarget.id);
            toast.success('Candidate deleted');
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete candidate');
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    const exportCandidates = async () => {
        setExporting(true);
        try {
            await candidatesApi.exportCandidates();
            toast.success('Candidates exported');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to export candidates');
        } finally {
            setExporting(false);
        }
    };

    const exportResumes = async () => {
        setZipping(true);
        try {
            await candidatesApi.downloadAllResumes();
            toast.success('Resumes download started');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to download resumes');
        } finally {
            setZipping(false);
        }
    };

    const nativeSelectClass =
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

    const hiddenKeys = new Set(
        candidateDefs.filter((f) => f.is_built_in && (f.deleted_at || !f.is_active || !f.show_in_form)).map((f) => f.key)
    );
    const show = (key: string) => !hiddenKeys.has(key);
    const labelFor = (key: string, fallback: string) =>
        candidateDefs.find((f) => f.is_built_in && f.entity === 'CANDIDATE' && f.key === key)?.label || fallback;
    const customDefs = candidateDefs
        .filter((f) => !f.is_built_in && f.is_active && !f.deleted_at && f.show_in_form)
        .sort((a, b) => a.sort_order - b.sort_order);

    const setCustom = (code: string, value: unknown) =>
        setCustomFields((prev) => ({ ...prev, [code]: value }));

    const columns = [
        {
            key: 'candidate',
            header: 'CANDIDATE',
            cell: (c: CandidateItem) => (
                <Link href={`/admin/candidates/${c.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                        {initials(c.full_name)}
                    </div>
                    <div className="min-w-0">
                        <div className="font-medium hover:text-orange-600">{c.full_name}</div>
                        {c.reference && <div className="text-xs text-muted-foreground">{c.reference}</div>}
                    </div>
                </Link>
            ),
        },
        {
            key: 'contact',
            header: 'CONTACT',
            className: 'hidden md:table-cell',
            cell: (c: CandidateItem) => (
                <div className="text-sm text-muted-foreground">
                    {c.email && <div className="truncate max-w-[180px]">{c.email}</div>}
                    {c.phone && <div className="text-xs">{c.phone}</div>}
                </div>
            ),
        },
        {
            key: 'current_role',
            header: 'CURRENT ROLE',
            className: 'hidden lg:table-cell',
            cell: (c: CandidateItem) =>
                c.current_position ? (
                    <div>
                        <div className="max-w-[180px] truncate text-sm">{c.current_position}</div>
                        {c.current_company && <div className="text-xs text-muted-foreground">{c.current_company}</div>}
                    </div>
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
        {
            key: 'applications',
            header: 'APPLICATIONS',
            className: 'text-center',
            cell: (c: CandidateItem) => (
                <span className="inline-flex min-w-6 justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {c.applications_count}
                </span>
            ),
        },
        {
            key: 'ai_score',
            header: 'AI SCORE',
            className: 'text-center',
            cell: (c: CandidateItem) => (
                <div className="flex flex-col items-center gap-1">
                    <AiScoreBadge score={c.best_match_score} />
                    {c.ai_screened > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                            {c.ai_screened} screened
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'resume',
            header: 'RESUME',
            className: 'text-center',
            cell: (c: CandidateItem) =>
                c.resume_url ? (
                    <FileText className="mx-auto h-4 w-4 text-orange-600" />
                ) : (
                    <span className="text-muted-foreground/40">—</span>
                ),
        },
        {
            key: 'created',
            header: 'CREATED',
            className: 'hidden lg:table-cell',
            cell: (c: CandidateItem) => (
                <span className="text-xs text-muted-foreground">{formatDate(c.created_at)}</span>
            ),
        },
        {
            key: 'actions',
            header: 'ACTIONS',
            className: 'w-[72px] text-right',
            cell: (c: CandidateItem) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/admin/candidates/${c.id}`); }}>
                            <UserRound className="h-4 w-4" /> Open profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(c)}>
                            <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    const isInitialLoading = loading && candidates.length === 0;

    return (
        <ListPageShell>
            {isInitialLoading ? (
                <ListPageSkeleton columns={7} />
            ) : (
                <DataTable
                    className="flex flex-1 flex-col min-h-0"
                    data={candidates}
                    columns={columns}
                    onRowClick={(c) => router.push(`/admin/candidates/${c.id}`)}
                    searchPlaceholder="Search candidates…"
                    addLabel="New Candidate"
                    onAdd={openCreate}
                    exportActions={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className={toolbarInlineActionBtn} aria-label="Export">
                                    {exporting || zipping ? (
                                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4 shrink-0" />
                                    )}
                                    <ToolbarActionLabel>
                                        {exporting || zipping ? 'Exporting…' : 'Export'}
                                    </ToolbarActionLabel>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={exportCandidates} disabled={exporting || zipping}>
                                    <FileSpreadsheet className="h-4 w-4" /> Export candidates (.csv)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={exportResumes} disabled={exporting || zipping}>
                                    <FileArchive className="h-4 w-4" /> Download all resumes (.zip)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                    searchFields={['full_name', 'email', 'phone', 'current_position', 'current_company', 'skills', 'reference']}
                    emptyMessage={total === 0 ? 'No candidates yet.' : 'No candidates match your search.'}
                />
            )}

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden grid-rows-[auto_minmax(0,1fr)_auto]">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Candidate' : 'New Candidate'}</DialogTitle>
                        <DialogDescription>
                            {editing ? 'Update the candidate profile.' : 'Add a candidate to the database.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 overflow-y-auto min-h-0 pr-1 sm:grid-cols-2">
                        {defsLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-9 w-full animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
                            ))
                        ) : (
                            <>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="c-full-name">{labelFor('full_name', 'Full Name')} *</Label>
                            <Input
                                id="c-full-name"
                                value={form.full_name}
                                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                            />
                        </div>
                        {show('email') && (
                            <div className="space-y-2">
                                <Label htmlFor="c-email">{labelFor('email', 'Email')}</Label>
                                <Input
                                    id="c-email"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                />
                            </div>
                        )}
                        {show('phone') && (
                            <div className="space-y-2">
                                <Label htmlFor="c-phone">{labelFor('phone', 'Phone')}</Label>
                                <Input
                                    id="c-phone"
                                    value={form.phone}
                                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                />
                            </div>
                        )}
                        {show('current_position') && (
                            <div className="space-y-2">
                                <Label htmlFor="c-current-position">{labelFor('current_position', 'Current Position')}</Label>
                                <Input
                                    id="c-current-position"
                                    value={form.current_position}
                                    onChange={(e) => setForm((f) => ({ ...f, current_position: e.target.value }))}
                                />
                            </div>
                        )}
                        {show('current_company') && (
                            <div className="space-y-2">
                                <Label htmlFor="c-current-company">{labelFor('current_company', 'Current Company')}</Label>
                                <Input
                                    id="c-current-company"
                                    value={form.current_company}
                                    onChange={(e) => setForm((f) => ({ ...f, current_company: e.target.value }))}
                                />
                            </div>
                        )}
                        {show('location') && (
                            <div className="space-y-2">
                                <Label htmlFor="c-location">{labelFor('location', 'Current Location')}</Label>
                                <Input
                                    id="c-location"
                                    value={form.location}
                                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                                />
                            </div>
                        )}
                        {show('experience') && (
                            <div className="space-y-2">
                                <Label htmlFor="c-experience">{labelFor('experience', 'Experience')}</Label>
                                <Input
                                    id="c-experience"
                                    value={form.experience}
                                    onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}
                                    placeholder="e.g. 5 years"
                                />
                            </div>
                        )}
                        {show('notice_period') && (
                            <div className="space-y-2">
                                <Label htmlFor="c-notice">{labelFor('notice_period', 'Notice Period')}</Label>
                                <Input
                                    id="c-notice"
                                    value={form.notice_period}
                                    onChange={(e) => setForm((f) => ({ ...f, notice_period: e.target.value }))}
                                    placeholder="e.g. 30 days"
                                />
                            </div>
                        )}
                        {show('source') && (
                            <div className="space-y-2">
                                <Label htmlFor="c-source">{labelFor('source', 'Source')}</Label>
                                <select
                                    id="c-source"
                                    value={form.source}
                                    onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                                    className={nativeSelectClass}
                                >
                                    <option value="">—</option>
                                    {CANDIDATE_SOURCES.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {show('linkedin_url') && (
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="c-linkedin">{labelFor('linkedin_url', 'LinkedIn')}</Label>
                                <Input
                                    id="c-linkedin"
                                    value={form.linkedin_url}
                                    onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
                                    placeholder="https://linkedin.com/in/…"
                                />
                            </div>
                        )}
                        {show('skills') && (
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="c-skills">{labelFor('skills', 'Skills')}</Label>
                                <Input
                                    id="c-skills"
                                    value={form.skills}
                                    onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
                                    placeholder="Comma separated, e.g. React, Python, AWS"
                                />
                            </div>
                        )}
                        {show('description') && (
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="c-description">{labelFor('description', 'Notes')}</Label>
                                <Textarea
                                    id="c-description"
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                />
                            </div>
                        )}
                        {customDefs.map((def) => (
                            <div key={def.id} className={def.field_type === 'textarea' ? 'space-y-2 sm:col-span-2' : 'space-y-2'}>
                                <CustomFieldRow
                                    def={def}
                                    value={customFields[def.code]}
                                    onChange={(v) => setCustom(def.code, v)}
                                />
                            </div>
                        ))}
                        </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button onClick={save} disabled={saving}>
                            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Candidate'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Delete candidate?"
                description={deleteTarget ? `${deleteTarget.full_name} will be permanently removed.` : undefined}
                confirmLabel="Delete"
                destructive
                busy={deleting}
                onConfirm={confirmDelete}
            />
        </ListPageShell>
    );
}
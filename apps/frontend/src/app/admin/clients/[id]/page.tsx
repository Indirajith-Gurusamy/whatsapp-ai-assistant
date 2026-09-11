'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
    clientsApi,
    fieldsApi,
    jobsApi,
    formatDate,
    type ClientItem,
    type FieldDef,
    type JobItem,
} from '@/lib/recruitment';
import { CustomFieldValues } from '@/components/recruitment/CustomFieldValues';
import { CustomFieldRow } from '@/components/recruitment/CustomFieldControls';
import { ConfirmDialog } from '@/components/recruitment/ConfirmDialog';
import { DetailPageSkeleton } from '@/components/data/DetailPageSkeleton';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
    Building2,
    CalendarDays,
    ChevronDown,
    Globe,
    MapPin,
    Pencil,
    Trash2,
} from 'lucide-react';

interface ClientFormState {
    name: string;
    location: string;
    description: string;
}

export default function ClientDetailPage() {
    const params = useParams<{ id: string }>();
    const clientId = Number(params.id);
    const router = useRouter();
    const { isAdminOrHR, isLoading: authLoading } = useAuth();

    const [client, setClient] = useState<ClientItem | null>(null);
    const [jobs, setJobs] = useState<JobItem[]>([]);
    const [clientDefs, setClientDefs] = useState<FieldDef[]>([]);
    const [defsLoading, setDefsLoading] = useState(true);
    const [loading, setLoading] = useState(true);

    const [editOpen, setEditOpen] = useState(false);
    const [form, setForm] = useState<ClientFormState>({ name: '', location: '', description: '' });
    const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
    const [saving, setSaving] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fieldsApi.list({ entity: 'CLIENT', include_deleted: true })
            .then((res) => setClientDefs(res.items))
            .catch(() => {})
            .finally(() => setDefsLoading(false));
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [clientRes, jobsRes] = await Promise.all([
                clientsApi.get(clientId),
                jobsApi.list({ organization_id: clientId }),
            ]);
            setClient(clientRes);
            setJobs(jobsRes.items);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load client');
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        load();
    }, [load]);

    const openEdit = () => {
        if (!client) return;
        setForm({
            name: client.name,
            location: client.location ?? '',
            description: client.description ?? '',
        });
        setCustomFields(client.custom_fields ?? {});
        setEditOpen(true);
    };

    const save = async () => {
        if (!form.name.trim()) {
            toast.error('Client name is required');
            return;
        }
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                name: form.name.trim(),
                location: form.location.trim() || null,
                description: form.description.trim() || null,
                custom_fields: customFields,
            };
            const updated = await clientsApi.update(clientId, payload);
            setClient(updated);
            setEditOpen(false);
            toast.success('Client updated');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save client');
        } finally {
            setSaving(false);
        }
    };

    const deleteClient = async () => {
        setDeleting(true);
        try {
            await clientsApi.remove(clientId);
            toast.success('Client deleted');
            router.push('/admin/clients');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete client');
            setDeleting(false);
        }
    };

    if (authLoading || loading) {
        return <DetailPageSkeleton variant="client" />;
    }

    if (!isAdminOrHR() || !client) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <p className="text-muted-foreground">Client not found or you lack access.</p>
            </div>
        );
    }

    const hiddenKeys = new Set(
        clientDefs.filter((f) => f.is_built_in && (f.deleted_at || !f.is_active || !f.show_in_form)).map((f) => f.key)
    );
    const show = (key: string) => !hiddenKeys.has(key);
    const labelFor = (key: string, fallback: string) =>
        clientDefs.find((f) => f.is_built_in && f.entity === 'CLIENT' && f.key === key)?.label || fallback;
    const customDefs = clientDefs
        .filter((f) => !f.is_built_in && f.is_active && !f.deleted_at && f.show_in_form)
        .sort((a, b) => a.sort_order - b.sort_order);

    const setCustom = (code: string, value: unknown) =>
        setCustomFields((prev) => ({ ...prev, [code]: value }));

    return (
        <div className="flex h-full w-full flex-col gap-4 overflow-y-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-bold">{client.name}</h1>
                            {client.is_archived && <Badge variant="secondary">Archived</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {client.job_count} job{client.job_count === 1 ? '' : 's'} · added {formatDate(client.created_at)}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 text-sm font-medium">
                                Actions
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={openEdit} className="cursor-pointer">
                                <Pencil className="h-4 w-4 mr-2" /> Edit client
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => router.push(`/admin/jobs?client=${client.id}`)}
                                className="cursor-pointer"
                            >
                                <Globe className="h-4 w-4 mr-2" /> View jobs
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteOpen(true)}
                                className="cursor-pointer"
                            >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete client
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Meta cards */}
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" /> Location
                    </div>
                    <div className="mt-1 text-sm font-medium">{client.location || '—'}</div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4" /> Added
                    </div>
                    <div className="mt-1 text-sm font-medium">{formatDate(client.created_at)}</div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" /> Active jobs
                    </div>
                    <div className="mt-1 text-2xl font-bold">{jobs.length}</div>
                </div>
            </div>

            {client.description && (
                <div className="rounded-lg border bg-card p-4">
                    <h3 className="mb-2 text-sm font-semibold">Description</h3>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{client.description}</p>
                </div>
            )}

            {client.custom_fields && Object.keys(client.custom_fields).length > 0 && (
                <div className="rounded-lg border bg-card p-4">
                    <h3 className="mb-3 text-sm font-semibold">Additional details</h3>
                    <CustomFieldValues defs={clientDefs} values={client.custom_fields} />
                </div>
            )}

            {/* Jobs */}
            <div>
                <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Jobs</h2>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/admin/jobs?client=${client.id}`)}>
                        <Globe className="h-4 w-4" /> View all jobs
                    </Button>
                </div>
                {jobs.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No jobs for this client yet. Create one from the Jobs page.
                    </p>
                ) : (
                    <div className="divide-y rounded-lg border bg-card">
                        {jobs.map((job) => (
                            <Link
                                key={job.id}
                                href={`/admin/jobs/${job.id}`}
                                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                            >
                                <div className="min-w-0">
                                    <div className="text-sm font-medium">{job.title}</div>
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                        {job.location || (job.is_remote ? 'Remote' : '—')}
                                        {job.contract_type ? ` · ${job.contract_type}` : ''}
                                        {` · ${formatDate(job.created_at)}`}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="capitalize">{job.status.toLowerCase()}</Badge>
                                    {job.is_published && <Badge>Published</Badge>}
                                    <span className="text-xs text-muted-foreground">{job.candidates_count} candidates</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Client</DialogTitle>
                        <DialogDescription>Update the client details below.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {defsLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-9 w-full animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
                            ))
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="client-name">{labelFor('name', 'Name')} *</Label>
                                    <Input
                                        id="client-name"
                                        value={form.name}
                                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g. Acme Corp"
                                    />
                                </div>
                                {show('location') && (
                                    <div className="space-y-2">
                                        <Label htmlFor="client-location">{labelFor('location', 'Location')}</Label>
                                        <Input
                                            id="client-location"
                                            value={form.location}
                                            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                                            placeholder="e.g. Dubai, UAE"
                                        />
                                    </div>
                                )}
                                {show('description') && (
                                    <div className="space-y-2">
                                        <Label htmlFor="client-description">{labelFor('description', 'Description')}</Label>
                                        <Textarea
                                            id="client-description"
                                            value={form.description}
                                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                            rows={3}
                                            placeholder="Short description of the client"
                                        />
                                    </div>
                                )}
                                {customDefs.map((def) => (
                                    <div key={def.id} className="space-y-2">
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
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={save} disabled={saving}>
                            {saving ? 'Saving…' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete client?"
                description={(client.name ?? '').trim()
                    ? `"${client.name}" and its jobs will be removed. This cannot be undone.`
                    : undefined}
                confirmLabel="Delete"
                destructive
                busy={deleting}
                onConfirm={deleteClient}
            />
        </div>
    );
}
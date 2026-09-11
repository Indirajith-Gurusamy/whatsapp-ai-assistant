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
import { clientsApi, fieldsApi, formatDate, type ClientItem, type FieldDef } from '@/lib/recruitment';
import { useAuth } from '@/contexts/AuthContext';
import { ListPageSkeleton } from '@/components/data/ListPageSkeleton';
import { DataTable } from '@/components/data/DataTable';
import { toast } from 'sonner';
import { MoreVertical, Pencil, Trash2, Building2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ClientFormState {
    name: string;
    location: string;
    description: string;
}

const EMPTY_FORM: ClientFormState = { name: '', location: '', description: '' };

export default function ClientsPage() {
    const { isAdminOrHR, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [clients, setClients] = useState<ClientItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ClientItem | null>(null);
    const [form, setForm] = useState<ClientFormState>(EMPTY_FORM);
    const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
    const [clientDefs, setClientDefs] = useState<FieldDef[]>([]);
    const [defsLoading, setDefsLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ClientItem | null>(null);
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
            const res = await clientsApi.list();
            setClients(res.items);
            setTotal(res.total);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load clients');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (authLoading) return <ListPageSkeleton columns={5} />;

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

    const openEdit = (client: ClientItem) => {
        setEditing(client);
        setForm({
            name: client.name,
            location: client.location ?? '',
            description: client.description ?? '',
        });
        setCustomFields(client.custom_fields ?? {});
        setModalOpen(true);
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
            };
            if (editing) {
                payload.custom_fields = customFields;
                await clientsApi.update(editing.id, payload);
                toast.success('Client updated');
            } else {
                if (Object.keys(customFields).length > 0) payload.custom_fields = customFields;
                await clientsApi.create(payload);
                toast.success('Client created');
            }
            setModalOpen(false);
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save client');
        } finally {
            setSaving(false);
        }
    };

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

    const columns = [
        {
            key: 'client',
            header: 'CLIENT',
            cell: (client: ClientItem) => (
                <Link href={`/admin/clients/${client.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                        <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{client.name}</span>
                            {client.is_archived && (
                                <span className="text-xs text-muted-foreground">(archived)</span>
                            )}
                        </div>
                        {client.description && (
                            <div className="truncate text-xs text-muted-foreground max-w-[220px]">
                                {client.description}
                            </div>
                        )}
                    </div>
                </Link>
            ),
        },
        {
            key: 'location',
            header: 'LOCATION',
            className: 'hidden md:table-cell',
            cell: (client: ClientItem) => (
                <span className="text-muted-foreground">{client.location || '—'}</span>
            ),
        },
        {
            key: 'jobs',
            header: 'JOBS',
            className: 'text-center',
            cell: (client: ClientItem) => (
                <span className="inline-flex min-w-6 justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {client.job_count}
                </span>
            ),
        },
        {
            key: 'created',
            header: 'CREATED',
            className: 'hidden lg:table-cell',
            cell: (client: ClientItem) => (
                <span className="text-xs text-muted-foreground">{formatDate(client.created_at)}</span>
            ),
        },
        {
            key: 'actions',
            header: 'ACTIONS',
            className: 'w-[72px] text-right',
            cell: (client: ClientItem) => (
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
                        <DropdownMenuItem onClick={() => openEdit(client)}>
                            <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(client)}
                        >
                            <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    const isInitialLoading = loading && clients.length === 0;

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await clientsApi.remove(deleteTarget.id);
            toast.success('Client deleted');
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete client');
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    return (
        <ListPageShell>
            {isInitialLoading ? (
                <ListPageSkeleton columns={5} />
            ) : (
                <DataTable
                    className="flex flex-1 flex-col min-h-0"
                    data={clients}
                    columns={columns}
                    onRowClick={(client) => router.push(`/admin/clients/${client.id}`)}
                    searchPlaceholder="Search clients…"
                    addLabel="New Client"
                    onAdd={openCreate}
                    searchFields={['name', 'location', 'description']}
                    emptyMessage={total === 0 ? 'No clients yet.' : 'No clients match your search.'}
                />
            )}

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Client' : 'New Client'}</DialogTitle>
                        <DialogDescription>
                            {editing ? 'Update the client details below.' : 'Add a client (organization) for your staffing services.'}
                        </DialogDescription>
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
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button onClick={save} disabled={saving}>
                            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Client'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Delete client?"
                description={deleteTarget ? `"${deleteTarget.name}" and its jobs will be removed. This cannot be undone.` : undefined}
                confirmLabel="Delete"
                destructive
                busy={deleting}
                onConfirm={confirmDelete}
            />
        </ListPageShell>
    );
}
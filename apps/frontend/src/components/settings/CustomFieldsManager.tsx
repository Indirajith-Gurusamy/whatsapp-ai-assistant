"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GripVertical, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    FIELD_ENTITIES,
    FIELD_TYPES,
    FieldDef,
    FieldEntity,
    fieldsApi,
} from "@/lib/recruitment";

const FLAG_LABELS: { key: "show_in_form" | "show_in_apply" | "show_in_list"; label: string; title: string }[] = [
    { key: "show_in_form", label: "Admin form", title: "Show in the admin create/edit form" },
    { key: "show_in_apply", label: "Careers apply", title: "Show on the careers apply form" },
    { key: "show_in_list", label: "List page", title: "Show in the list view" },
];

interface FieldFormState {
    label: string;
    field_type: string;
    options: string;
    required: boolean;
    show_in_form: boolean;
    show_in_apply: boolean;
    show_in_list: boolean;
}

const emptyForm = (): FieldFormState => ({
    label: "",
    field_type: "text",
    options: "",
    required: false,
    show_in_form: true,
    show_in_apply: true,
    show_in_list: true,
});

export function CustomFieldsManager() {
    const [fields, setFields] = useState<FieldDef[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeEntity, setActiveEntity] = useState<FieldEntity>("JOB");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<FieldDef | null>(null);
    const [deleting, setDeleting] = useState<FieldDef | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<FieldFormState>(emptyForm());

    const load = useCallback(async () => {
        try {
            const res = await fieldsApi.list({ include_deleted: true });
            setFields(res.items);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to load fields");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const entityFields = useMemo(
        () =>
            fields
                .filter((f) => f.entity === activeEntity && f.is_active && !f.deleted_at)
                .sort((a, b) => a.sort_order - b.sort_order),
        [fields, activeEntity]
    );

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm());
        setDialogOpen(true);
    };

    const openEdit = (f: FieldDef) => {
        setEditing(f);
        setForm({
            label: f.label,
            field_type: f.field_type,
            options: (f.options || []).join("\n"),
            required: f.required,
            show_in_form: f.show_in_form,
            show_in_apply: f.show_in_apply,
            show_in_list: f.show_in_list,
        });
        setDialogOpen(true);
    };

    const setFlag = (key: keyof FieldFormState, value: boolean) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const validate = (): string | null => {
        if (!form.label.trim()) return "Label is required.";
        if (["select", "multi_select"].includes(form.field_type) && !form.options.trim()) {
            return "Add at least one option for this field type (one per line).";
        }
        return null;
    };

    const save = async () => {
        const err = validate();
        if (err) {
            toast.error(err);
            return;
        }
        setSaving(true);
        try {
            const payload = {
                label: form.label.trim(),
                field_type: form.field_type,
                options: ["select", "multi_select"].includes(form.field_type)
                    ? form.options.split("\n").map((o) => o.trim()).filter(Boolean)
                    : [],
                required: form.required,
                show_in_form: form.show_in_form,
                show_in_apply: form.show_in_apply,
                show_in_list: form.show_in_list,
            };
            if (editing) {
                await fieldsApi.update(editing.id, payload);
                toast.success("Field updated");
            } else {
                await fieldsApi.create({ entity: activeEntity, ...payload });
                toast.success("Field created");
            }
            setDialogOpen(false);
            await load();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to save field");
        } finally {
            setSaving(false);
        }
    };

    const toggleVisibility = async (f: FieldDef, flag: "show_in_form" | "show_in_apply" | "show_in_list") => {
        try {
            await fieldsApi.update(f.id, { [flag]: !f[flag] });
            await load();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to update field");
        }
    };

    const confirmDelete = async () => {
        if (!deleting) return;
        try {
            await fieldsApi.remove(deleting.id);
            toast.success(deleting.is_built_in ? "Field hidden" : "Field deleted");
            setDeleting(null);
            await load();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to delete field");
        }
    };

    const [dragIdx, setDragIdx] = useState<number | null>(null);

    const reorderList = async (from: number, to: number) => {
        if (from === to || from < 0 || to < 0 || from >= entityFields.length || to >= entityFields.length) return;
        const sorted = [...entityFields];
        const [item] = sorted.splice(from, 1);
        sorted.splice(to, 0, item);
        setFields((prev) => {
            const ids = new Set(sorted.map((f) => f.id));
            return [...sorted, ...prev.filter((f) => !ids.has(f.id))];
        });
        try {
            await fieldsApi.reorder(activeEntity, sorted.map((f) => f.code));
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to reorder");
            await load();
        }
        setDragIdx(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading fields…
            </div>
        );
    }

    const needsOptions = ["select", "multi_select"].includes(form.field_type);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="text-sm font-medium">Custom fields</p>
                    <p className="text-xs text-gray-400">
                        Configure which fields appear on forms, lists and the careers apply page.
                    </p>
                </div>
                <Button type="button" size="sm" onClick={openCreate}>
                    <Plus className="mr-1 h-4 w-4" /> Add field
                </Button>
            </div>

            <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 pb-2">
                {FIELD_ENTITIES.map((e) => {
                    const count = fields.filter((f) => f.entity === e.value && f.is_active && !f.deleted_at).length;
                    return (
                        <button
                            key={e.value}
                            type="button"
                            onClick={() => setActiveEntity(e.value)}
                            className={cn(
                                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                                activeEntity === e.value
                                    ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                                    : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                        >
                            {e.label}
                            <span className="ml-1.5 text-xs text-gray-400">{count}</span>
                        </button>
                    );
                })}
            </div>

            {entityFields.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                    No fields yet. Add one to start customizing this entity.
                </p>
            ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {entityFields.map((f, idx) => (
                            <div
                                key={f.id}
                                draggable
                                onDragStart={() => setDragIdx(idx)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={async (e) => {
                                    e.preventDefault();
                                    await reorderList(dragIdx ?? idx, idx);
                                }}
                                onDragEnd={() => setDragIdx(null)}
                                className={cn(
                                    "flex flex-wrap items-center gap-3 px-3 py-2 sm:px-4",
                                    dragIdx !== null && "cursor-grab",
                                    dragIdx === idx && "opacity-50",
                                )}
                            >
                                <div className="flex items-center gap-1.5">
                                    <div className="cursor-grab text-gray-400 select-none active:cursor-grabbing" title="Drag to reorder">
                                        <GripVertical className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <button
                                            type="button"
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                                            disabled={idx === 0}
                                            onClick={() => reorderList(idx, idx - 1)}
                                            aria-label="Move up"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                                            disabled={idx === entityFields.length - 1}
                                            onClick={() => reorderList(idx, idx + 1)}
                                            aria-label="Move down"
                                        >
                                            ↓
                                        </button>
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                                        {f.label}
                                        {f.is_built_in && (
                                            <span className="ml-1.5 rounded bg-gray-100 px-1 py-0.5 text-[10px] font-normal text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                built-in
                                            </span>
                                        )}
                                    </p>
                                    <p className="font-mono text-[11px] text-gray-400">
                                        {f.is_built_in ? (f.key ?? f.code) : f.code} · {f.field_type}
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                                    {FLAG_LABELS.map((fl) => (
                                        <label
                                            key={fl.key}
                                            className="flex cursor-pointer items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1"
                                            title={fl.title}
                                        >
                                            <Checkbox
                                                checked={f[fl.key]}
                                                onCheckedChange={() => toggleVisibility(f, fl.key)}
                                            />
                                            <span>{fl.label}</span>
                                        </label>
                                    ))}
                                </div>

                                <div className="flex items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => openEdit(f)}
                                        aria-label="Edit field"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-red-500"
                                        onClick={() => setDeleting(f)}
                                        aria-label="Delete field"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <p className="text-xs text-gray-400">
                Deleting a field removes it from the UI. Its data is kept.
            </p>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit field" : "Add field"}</DialogTitle>
                        <DialogDescription>
                            {editing
                                ? "Update the field definition for this entity."
                                : `New field for ${FIELD_ENTITIES.find((e) => e.value === activeEntity)?.label ?? activeEntity}.`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {editing && editing.is_built_in ? (
                            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                                Built-in field <span className="font-mono">{editing.key ?? editing.code}</span> — type
                                and options are fixed; you can edit the label and visibility flags.
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <Label htmlFor="field_type">Field type</Label>
                                <Select value={form.field_type} onValueChange={(v) => setForm((p) => ({ ...p, field_type: v }))}>
                                    <SelectTrigger id="field_type" className="w-full">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FIELD_TYPES.map((t) => (
                                            <SelectItem key={t} value={t}>
                                                {t.replace('_', ' ')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="field_label">Label</Label>
                            <Input
                                id="field_label"
                                value={form.label}
                                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                                placeholder="e.g. Years of experience"
                            />
                        </div>

                        {needsOptions && (
                            <div className="space-y-1.5">
                                <Label htmlFor="field_options">Options (one per line)</Label>
                                <Textarea
                                    id="field_options"
                                    rows={4}
                                    value={form.options}
                                    onChange={(e) => setForm((p) => ({ ...p, options: e.target.value }))}
                                    placeholder={"Option A\nOption B\nOption C"}
                                />
                            </div>
                        )}

                        <Label className="flex items-center gap-2 text-sm font-medium">
                            <Checkbox
                                checked={form.required}
                                onCheckedChange={(c) => setForm((p) => ({ ...p, required: c === true }))}
                            />
                            Required field
                        </Label>

                        <div className="space-y-1.5">
                            <Label>Visibility</Label>
                            <div className="grid gap-1.5">
                                {FLAG_LABELS.map((fl) => (
                                    <Label key={fl.key} className="flex items-center gap-2 !text-sm font-normal cursor-pointer">
                                        <Checkbox
                                            checked={form[fl.key]}
                                            onCheckedChange={(c) => setFlag(fl.key, c === true)}
                                        />
                                        {fl.label}
                                    </Label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={save} disabled={saving}>
                            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                            {editing ? "Save changes" : "Create field"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleting} onOpenChange={(o) => setDeleting(o ? deleting : null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{deleting?.is_built_in ? "Hide built-in field?" : "Delete field?"}</DialogTitle>
                        <DialogDescription>
                            “{deleting?.label}” will be hidden from all forms and lists. Existing data is kept.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmDelete}>
                            {deleting?.is_built_in ? "Hide field" : "Delete field"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
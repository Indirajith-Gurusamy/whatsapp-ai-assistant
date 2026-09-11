'use client';

import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TurndownService from 'turndown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Markdown } from '@/components/ui/markdown';
import { CustomFieldRow } from '@/components/recruitment/CustomFieldControls';
import {
    clientsApi,
    jobsApi,
    fieldsApi,
    CONTRACT_TYPES,
    SALARY_CURRENCIES,
    SALARY_FREQUENCIES,
    type ClientItem,
    type FieldDef,
    type JobItem,
} from '@/lib/recruitment';
import { toast } from 'sonner';

interface JobFormState {
    title: string;
    organization_id: string;
    status: string;
    description: string;
    location: string;
    is_remote: boolean;
    contract_type: string;
    experience: string;
    salary_currency: string;
    salary_min: string;
    salary_max: string;
    salary_frequency: string;
    salary_negotiable: boolean;
    headcount: string;
    tags: string;
    is_published: boolean;
}

const EMPTY_FORM: JobFormState = {
    title: '',
    organization_id: '',
    status: 'DRAFT',
    description: '',
    location: '',
    is_remote: false,
    contract_type: 'Full-time',
    experience: '',
    salary_currency: 'USD',
    salary_min: '',
    salary_max: '',
    salary_frequency: 'per month',
    salary_negotiable: false,
    headcount: '1',
    tags: '',
    is_published: false,
};

function jobToForm(job: JobItem): JobFormState {
    return {
        title: job.title,
        organization_id: job.organization_id != null ? String(job.organization_id) : '',
        status: job.status,
        description: job.description ?? '',
        location: job.location ?? '',
        is_remote: job.is_remote,
        contract_type: job.contract_type ?? 'Full-time',
        experience: job.experience ?? '',
        salary_currency: job.salary_currency ?? 'USD',
        salary_min: job.salary_min != null ? String(job.salary_min) : '',
        salary_max: job.salary_max != null ? String(job.salary_max) : '',
        salary_frequency: job.salary_frequency ?? 'per month',
        salary_negotiable: job.salary_negotiable,
        headcount: String(job.headcount),
        tags: (job.tags ?? []).join(', '),
        is_published: job.is_published,
    };
}

const nativeSelectClass =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

interface JobFormContentsProps {
    job: JobItem | null;
    onSaved?: () => void;
    onCancel?: () => void;
}

export function JobFormContents({ job, onSaved, onCancel }: JobFormContentsProps) {
    const [form, setForm] = useState<JobFormState>(EMPTY_FORM);
    const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
    const [clients, setClients] = useState<ClientItem[]>([]);
    const [jobFields, setJobFields] = useState<FieldDef[]>([]);
    const [defsLoading, setDefsLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const descRef = useRef<HTMLDivElement>(null);
    const turndownRef = useRef(
        new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' })
    );

    const markdownToHtml = useCallback((md: string) => {
        try {
            return renderToStaticMarkup(createElement(Markdown, null, md));
        } catch {
            return '';
        }
    }, []);

    const renderDesc = useCallback(
        (md: string) => {
            if (descRef.current) {
                descRef.current.innerHTML = md.trim() ? markdownToHtml(md) : '';
            }
        },
        [markdownToHtml]
    );

    const loadDefs = () => {
        setDefsLoading(true);
        return Promise.all([
            clientsApi.list(),
            fieldsApi.list({ entity: 'JOB', include_deleted: true }),
        ])
            .then(([clientsRes, fieldsRes]) => {
                setClients(clientsRes.items);
                setJobFields(fieldsRes.items);
            })
            .catch(() => {})
            .finally(() => setDefsLoading(false));
    };

    useEffect(() => {
        setForm(job ? jobToForm(job) : EMPTY_FORM);
        setCustomFields(job?.custom_fields ?? {});
        loadDefs();
        renderDesc(job?.description ?? '');
    }, [job, renderDesc]);

    const save = async () => {
        if (!form.title.trim()) {
            toast.error('Job title is required');
            return;
        }
        setSaving(true);
        try {
            const archived = form.status === 'ARCHIVED';
            const nextStatus = job
                ? archived
                    ? 'ARCHIVED'
                    : job.is_published
                        ? 'ACTIVE'
                        : 'DRAFT'
                : 'DRAFT';
            const payload: Record<string, unknown> = {
                title: form.title.trim(),
                organization_id: form.organization_id ? Number(form.organization_id) : null,
                status: nextStatus,
                description: form.description.trim() || null,
                location: form.location.trim() || null,
                is_remote: form.is_remote,
                contract_type: form.contract_type || null,
                experience: form.experience.trim() || null,
                salary_currency: form.salary_currency || null,
                salary_min: form.salary_min ? Number(form.salary_min) : null,
                salary_max: form.salary_max ? Number(form.salary_max) : null,
                salary_frequency: form.salary_frequency || null,
                salary_negotiable: form.salary_negotiable,
                headcount: Number(form.headcount) || 1,
                tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) || null,
            };
            if (job) {
                payload.custom_fields = customFields;
                await jobsApi.update(job.id, payload);
                toast.success('Job updated');
            } else {
                if (Object.keys(customFields).length > 0) payload.custom_fields = customFields;
                await jobsApi.create(payload);
                toast.success('Job created');
            }
            onSaved?.();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save job');
        } finally {
            setSaving(false);
        }
    };

    const hiddenKeys = new Set(
        jobFields.filter((f) => f.is_built_in && (f.deleted_at || !f.is_active || !f.show_in_form)).map((f) => f.key)
    );
    const show = (key: string) => !hiddenKeys.has(key);
    const labelFor = (key: string, fallback: string) =>
        jobFields.find((f) => f.is_built_in && f.entity === 'JOB' && f.key === key)?.label || fallback;
    const customDefs = jobFields
        .filter((f) => !f.is_built_in && f.is_active && !f.deleted_at && f.show_in_form)
        .sort((a, b) => a.sort_order - b.sort_order);

    const setCustom = (code: string, value: unknown) =>
        setCustomFields((prev) => ({ ...prev, [code]: value }));

    return (
        <div className="flex min-h-0 flex-col overflow-hidden">
            {defsLoading ? (
                <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 overflow-y-auto pr-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-9 w-full animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 pr-1 sm:grid-cols-2 min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="job-title">{labelFor('title', 'Job Title')} *</Label>
                    <Input
                        id="job-title"
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="e.g. Senior React Developer"
                    />
                </div>
                {show('description') && (
                    <div className="space-y-2 sm:col-span-2">
                        <Label>{labelFor('description', 'Description')}</Label>
                        <div className="relative">
                            <div
                                ref={descRef}
                                contentEditable
                                role="textbox"
                                aria-multiline="true"
                                data-placeholder="Role responsibilities, requirements, etc."
                                className="description-editor markdown-body min-h-[128px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                onInput={() => {
                                    const el = descRef.current;
                                    if (!el) return;
                                    let md = '';
                                    try {
                                        md = turndownRef.current.turndown(el.innerHTML);
                                    } catch {
                                        md = el.innerText || '';
                                    }
                                    setForm((f) => (f.description === md ? f : { ...f, description: md }));
                                }}
                                onPaste={(e) => {
                                    e.preventDefault();
                                    const text = e.clipboardData.getData('text/plain');
                                    setForm((f) => ({ ...f, description: text }));
                                    renderDesc(text);
                                }}
                                onBlur={() => renderDesc(form.description)}
                            />
                        </div>
                    </div>
                )}
                {show('organization_id') && (
                    <div className="space-y-2">
                        <Label htmlFor="job-client">Client</Label>
                        <select
                            id="job-client"
                            value={form.organization_id}
                            onChange={(e) => setForm((f) => ({ ...f, organization_id: e.target.value }))}
                            className={nativeSelectClass}
                        >
                            <option value="">No client</option>
                            {clients.map((c) => (
                                <option key={c.id} value={String(c.id)}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                {show('location') && (
                    <div className="space-y-2">
                        <Label htmlFor="job-location">{labelFor('location', 'Location')}</Label>
                        <Input
                            id="job-location"
                            value={form.location}
                            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                            placeholder="e.g. Dubai, UAE"
                        />
                    </div>
                )}
                {show('is_remote') && (
                    <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <Checkbox
                                checked={form.is_remote}
                                onCheckedChange={(v) => setForm((f) => ({ ...f, is_remote: Boolean(v) }))}
                            />
                            {labelFor('is_remote', 'Remote position')}
                        </label>
                    </div>
                )}
                {show('contract_type') && (
                    <div className="space-y-2">
                        <Label htmlFor="job-contract">{labelFor('contract_type', 'Contract Type')}</Label>
                        <select
                            id="job-contract"
                            value={form.contract_type}
                            onChange={(e) => setForm((f) => ({ ...f, contract_type: e.target.value }))}
                            className={nativeSelectClass}
                        >
                            {CONTRACT_TYPES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                )}
                {show('experience') && (
                    <div className="space-y-2">
                        <Label htmlFor="job-experience">{labelFor('experience', 'Experience')}</Label>
                        <Input
                            id="job-experience"
                            value={form.experience}
                            onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}
                            placeholder="e.g. 3–5 years"
                        />
                    </div>
                )}
                {(['salary_currency', 'salary_min', 'salary_max', 'salary_frequency'].some((k) => show(k))) && (
                    <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                        {show('salary_currency') && (
                            <div className="space-y-2 flex-1">
                                <Label htmlFor="job-currency">{labelFor('salary_currency', 'Currency')}</Label>
                                <select
                                    id="job-currency"
                                    value={form.salary_currency}
                                    onChange={(e) => setForm((f) => ({ ...f, salary_currency: e.target.value }))}
                                    className={nativeSelectClass}
                                >
                                    {SALARY_CURRENCIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {show('salary_min') && (
                            <div className="space-y-2 flex-1">
                                <Label htmlFor="job-salary-min">{labelFor('salary_min', 'Salary Min')}</Label>
                                <Input
                                    id="job-salary-min"
                                    type="number"
                                    value={form.salary_min}
                                    onChange={(e) => setForm((f) => ({ ...f, salary_min: e.target.value }))}
                                    placeholder="0"
                                />
                            </div>
                        )}
                        {show('salary_max') && (
                            <div className="space-y-2 flex-1">
                                <Label htmlFor="job-salary-max">{labelFor('salary_max', 'Salary Max')}</Label>
                                <Input
                                    id="job-salary-max"
                                    type="number"
                                    value={form.salary_max}
                                    onChange={(e) => setForm((f) => ({ ...f, salary_max: e.target.value }))}
                                    placeholder="0"
                                />
                            </div>
                        )}
                        {show('salary_frequency') && (
                            <div className="space-y-2 w-32">
                                <Label htmlFor="job-frequency">{labelFor('salary_frequency', 'Frequency')}</Label>
                                <select
                                    id="job-frequency"
                                    value={form.salary_frequency}
                                    onChange={(e) => setForm((f) => ({ ...f, salary_frequency: e.target.value }))}
                                    className={nativeSelectClass}
                                >
                                    {SALARY_FREQUENCIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}
                {show('salary_negotiable') && (
                    <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <Checkbox
                                checked={form.salary_negotiable}
                                onCheckedChange={(v) => setForm((f) => ({ ...f, salary_negotiable: Boolean(v) }))}
                            />
                            {labelFor('salary_negotiable', 'Salary negotiable')}
                        </label>
                    </div>
                )}
                {show('headcount') && (
                    <div className="space-y-2">
                        <Label htmlFor="job-headcount">{labelFor('headcount', 'Headcount')}</Label>
                        <Input
                            id="job-headcount"
                            type="number"
                            min={1}
                            value={form.headcount}
                            onChange={(e) => setForm((f) => ({ ...f, headcount: e.target.value }))}
                        />
                    </div>
                )}
                {show('tags') && (
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="job-tags">{labelFor('tags', 'Tags')}</Label>
                        <Input
                            id="job-tags"
                            value={form.tags}
                            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                            placeholder="Comma separated, e.g. React, TypeScript, Remote"
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
                </div>
            )}
            <div className="flex shrink-0 items-center justify-end gap-2 pt-4">
                {onCancel && (
                    <Button variant="outline" onClick={onCancel} disabled={saving}>
                        Cancel
                    </Button>
                )}
                <Button onClick={save} disabled={saving}>
                    {saving ? 'Saving…' : job ? 'Save Changes' : 'Create Job'}
                </Button>
            </div>
        </div>
    );
}
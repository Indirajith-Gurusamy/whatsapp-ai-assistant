'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    careersApi,
    RESERVED_PREFIX,
    type ApplyResult,
    type CareersJob,
    type CareersSettings,
    type FieldDef as RecruitmentFieldDef,
} from '@/lib/recruitment';
import { CustomFieldRow } from '@/components/recruitment/CustomFieldControls';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, UploadCloud, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';

function ApplyHeader({ title, logo }: { title: string; logo?: string | null }) {
    return (
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
            <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4">
                {logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="" className="h-10 w-10 shrink-0 rounded object-contain" />
                )}
                <h1 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
            </div>
        </header>
    );
}

function ApplyFooter({ children }: { children: React.ReactNode }) {
    return (
        <footer className="sticky bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
            <div className="mx-auto w-full max-w-3xl px-4 py-3">{children}</div>
        </footer>
    );
}

function ApplyShell({
    headerTitle,
    headerBack,
    logo,
    children,
    footer,
}: {
    headerTitle: string;
    headerBack: string;
    logo?: string | null;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
            <ApplyHeader title={headerTitle} logo={logo} />
            <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
                <div className="sticky top-16 z-20 -mx-4 mb-5 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 sm:static sm:mx-0 sm:mb-5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:dark:bg-transparent">
                    <Link
                        href={headerBack}
                        className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 transition-colors hover:text-orange-600 dark:text-gray-300"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {headerBack === '/careers/jobs' ? 'Back to jobs' : 'Back to job'}
                    </Link>
                </div>
                {children}
            </main>
            {footer}
        </div>
    );
}

const DB_NAME = 'careers-apply';
const DB_STORE = 'files';

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(DB_STORE)) {
                req.result.createObjectStore(DB_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idbSet(key: string, value: File): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function idbGet(key: string): Promise<File | undefined> {
    const db = await openDb();
    return new Promise((resolve) => {
        const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key);
        req.onsuccess = () => resolve(req.result as File | undefined);
        req.onerror = () => resolve(undefined);
    });
}

async function idbDelete(key: string): Promise<void> {
    const db = await openDb();
    return new Promise((resolve) => {
        const tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
    });
}

const draftKey = (slug: string) => `apply_draft_${slug}`;
const fileKey = (slug: string) => `apply_file_${slug}`;

function loadDraft(slug: string): { values: Record<string, string>; customValues: Record<string, unknown>; consent: boolean } | null {
    try {
        const raw = sessionStorage.getItem(draftKey(slug));
        return raw ? (JSON.parse(raw) as { values: Record<string, string>; customValues: Record<string, unknown>; consent: boolean }) : null;
    } catch {
        return null;
    }
}

function saveDraft(
    slug: string,
    values: Record<string, string>,
    customValues: Record<string, unknown>,
    consent: boolean
) {
    try {
        sessionStorage.setItem(draftKey(slug), JSON.stringify({ values, customValues, consent }));
    } catch {
        /* storage unavailable — ignore */
    }
}

function clearDraft(slug: string) {
    try {
        sessionStorage.removeItem(draftKey(slug));
    } catch {
        /* ignore */
    }
    idbDelete(fileKey(slug)).catch(() => {});
}

export default function CareersApplyPage() {
    const params = useParams<{ slug: string }>();
    const slug = params.slug;

    const [settings, setSettings] = useState<CareersSettings | null>(null);
    const [job, setJob] = useState<CareersJob | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [values, setValues] = useState<Record<string, string>>({});
    const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
    const [resume, setResume] = useState<File | null>(null);
    const [consent, setConsent] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<ApplyResult | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [s, j] = await Promise.all([careersApi.settings(), careersApi.job(slug)]);
                if (cancelled) return;
                setSettings(s);
                setJob(j);
                const draft = loadDraft(slug);
                if (draft) {
                    setValues(draft.values ?? {});
                    setCustomValues(draft.customValues ?? {});
                    setConsent(!!draft.consent);
                }
                const storedFile = await idbGet(fileKey(slug));
                if (!cancelled && storedFile) setResume(storedFile);
            } catch {
                if (!cancelled) setNotFound(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    useEffect(() => {
        if (loading || !job) return;
        saveDraft(slug, values, customValues, consent);
    }, [values, customValues, consent, loading, job, slug]);

    useEffect(() => {
        if (loading || !job) return;
        if (resume) {
            idbSet(fileKey(slug), resume).catch(() => {});
        } else {
            idbDelete(fileKey(slug)).catch(() => {});
        }
    }, [resume, loading, job, slug]);

    const resumeEnabled = (settings?.apply_form_fields ?? []).includes('resume');

    const allDefs: RecruitmentFieldDef[] = (settings?.custom_fields ?? [])
        .filter((f) => f.is_active && !f.deleted_at && f.key !== 'source');

    const visibleDefs: RecruitmentFieldDef[] = allDefs
        .filter((f) => f.show_in_apply)
        .sort((a, b) => a.sort_order - b.sort_order);

    const visibleCodes = new Set(visibleDefs.map((f) => f.code));
    const mandatoryDefs = allDefs
        .filter((f) => f.key === 'full_name' || f.key === 'email')
        .filter((f) => !visibleCodes.has(f.code));
    const fields: RecruitmentFieldDef[] = [...mandatoryDefs, ...visibleDefs];

    const fieldValue = (def: RecruitmentFieldDef): unknown =>
        def.key != null ? values[def.code] : customValues[def.code];

    const setFieldValue = (def: RecruitmentFieldDef, v: unknown) => {
        if (def.key != null) {
            setValues((prev) => ({ ...prev, [def.code]: v == null ? '' : String(v) }));
        } else {
            setCustomValues((prev) => ({ ...prev, [def.code]: v }));
        }
    };

    if (loading) {
        return (
            <ApplyShell headerTitle="" headerBack="/careers/jobs" logo={settings?.company_logo_url}>
                <div className="space-y-4">
                    <div className="h-10 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-12 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                    ))}
                </div>
            </ApplyShell>
        );
    }

    if (notFound || !job) {
        return (
            <ApplyShell headerTitle="Job not found" headerBack="/careers/jobs" logo={settings?.company_logo_url}>
                <div className="rounded-lg border bg-white p-10 text-center dark:bg-gray-900">
                    <h1 className="text-lg font-bold">Job not found</h1>
                    <p className="mt-1 text-sm text-gray-500">This position may no longer be open.</p>
                    <Link href="/careers/jobs" className="mt-4 inline-block text-sm font-medium text-orange-600 hover:underline">
                        View all jobs
                    </Link>
                </div>
            </ApplyShell>
        );
    }

    const jobBack = `/careers/jobs/${job.slug}`;

    if (settings && !settings.enabled) {
        return (
            <ApplyShell headerTitle={`Applying for ${job.title}`} headerBack={jobBack} logo={settings?.company_logo_url}>
                <div className="rounded-lg border bg-white p-10 text-center dark:bg-gray-900">
                    <p className="text-gray-500">Applications are currently closed.</p>
                </div>
            </ApplyShell>
        );
    }

    if (result) {
        return (
            <ApplyShell
                headerTitle={`Applying for ${job.title}`}
                headerBack={jobBack}
                logo={settings?.company_logo_url}
                footer={
                    <ApplyFooter>
                        <Link href="/careers/jobs">
                            <Button variant="outline" className="h-11 w-full text-base">
                                Back to jobs
                            </Button>
                        </Link>
                    </ApplyFooter>
                }
            >
                <div className="rounded-xl border bg-white p-8 text-center dark:bg-gray-900">
                    {result.already_applied ? (
                        <Info className="mx-auto h-10 w-10 text-amber-500" />
                    ) : (
                        <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
                    )}
                    <h1 className="mt-3 text-xl font-bold">{result.already_applied ? 'Application already received' : 'Application submitted'}</h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {result.already_applied ? settings?.already_applied_message : settings?.success_message}
                    </p>
                    {result.resume_uploaded && (
                        <p className="mt-2 text-sm text-gray-500">{settings?.resume_note}</p>
                    )}
                    <Link href="/careers/jobs">
                        <Button variant="outline" className="mt-6">Back to jobs</Button>
                    </Link>
                </div>
            </ApplyShell>
        );
    }

    const submit = async () => {
        const fullName = String(values.full_name ?? '').trim();
        const email = String(values.email ?? '').trim();
        if (!fullName) {
            toast.error('Please enter your full name');
            return;
        }
        if (!email) {
            toast.error('Please enter your email');
            return;
        }
        if (settings?.require_consent && !consent) {
            toast.error('Please accept the consent statement to continue');
            return;
        }
        for (const def of fields) {
            if (!def.required) continue;
            const v = fieldValue(def);
            const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
            if (empty) {
                toast.error(`Please fill in “${def.label}”`);
                return;
            }
        }

        setSubmitting(true);
        try {
            const form = new FormData();
            for (const def of fields) {
                const v = fieldValue(def);
                if (v === undefined || v === null || v === '') continue;
                const key = def.key != null ? def.key : `${RESERVED_PREFIX}${def.code}`;
                if (Array.isArray(v)) {
                    form.append(key, JSON.stringify(v));
                } else if (typeof v === 'boolean') {
                    form.append(key, v ? 'true' : 'false');
                } else {
                    form.append(key, String(v));
                }
            }
            form.append('consent', settings?.require_consent && consent ? 'on' : 'off');
            if (resume) form.append('resume', resume, resume.name);
            const res = await careersApi.applyForm(slug, form);
            clearDraft(slug);
            setResult(res);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Application failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ApplyShell
            headerTitle={`Applying for ${job.title}`}
            headerBack={jobBack}
            logo={settings?.company_logo_url}
            footer={
                <ApplyFooter>
                    <Button onClick={submit} disabled={submitting} className="h-11 w-full text-base">
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {submitting ? 'Submitting…' : 'Submit application'}
                    </Button>
                </ApplyFooter>
            }
        >
            <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-900 sm:p-8">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {fields.map((def) => (
                        <CustomFieldRow
                            key={def.id}
                            def={def}
                            value={fieldValue(def)}
                            onChange={(v) => setFieldValue(def, v)}
                            id={`apply-${def.code}`}
                        />
                    ))}

                    {resumeEnabled && (
                        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                            <Label htmlFor="apply-resume">
                                Resume
                                <span className="ml-0.5 text-muted-foreground">(.pdf, .doc, .docx — max 1MB)</span>
                            </Label>
                            <label
                                htmlFor="apply-resume"
                                className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500 hover:border-orange-400 hover:text-orange-600 dark:border-gray-600"
                            >
                                <UploadCloud className="h-5 w-5 shrink-0" />
                                {resume ? (
                                    <span className="truncate font-medium text-gray-700 dark:text-gray-300">{resume.name}</span>
                                ) : (
                                    <span>Click to choose a file</span>
                                )}
                            </label>
                            <input
                                id="apply-resume"
                                type="file"
                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                className="hidden"
                                onChange={(e) => setResume(e.target.files?.[0] ?? null)}
                            />
                        </div>
                    )}

                    {settings?.require_consent && (
                        <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 sm:col-span-2 lg:col-span-3">
                            <input
                                type="checkbox"
                                checked={consent}
                                onChange={(e) => setConsent(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-orange-600"
                            />
                            <span>
                                {settings.consent_message || 'I agree to be contacted about my application.'}
                                {settings.privacy_policy_url && (
                                    <>
                                        {' '}
                                        <a href={settings.privacy_policy_url} target="_blank" rel="noreferrer" className="text-orange-600 underline">
                                            Privacy policy
                                        </a>
                                    </>
                                )}
                            </span>
                        </label>
                    )}
                </div>
            </div>
        </ApplyShell>
    );
}
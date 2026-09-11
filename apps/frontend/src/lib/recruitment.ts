// Recruitment (ATS) API client + shared helpers.

import { tokenStorage } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Types (mirror backend response schemas)
// ---------------------------------------------------------------------------

export type FieldEntity = 'CLIENT' | 'JOB' | 'CANDIDATE';

export interface FieldDef {
    id: string;
    entity: FieldEntity;
    code: string;
    key: string | null;
    label: string;
    field_type: string;
    options: string[];
    required: boolean;
    show_in_form: boolean;
    show_in_apply: boolean;
    show_in_list: boolean;
    sort_order: number;
    is_built_in: boolean;
    is_active: boolean;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
}

export const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select', 'multi_select', 'boolean', 'url', 'email'] as const;
export const FIELD_ENTITIES: { value: FieldEntity; label: string }[] = [
    { value: 'CLIENT', label: 'Client / Company' },
    { value: 'JOB', label: 'Job' },
    { value: 'CANDIDATE', label: 'Candidate' },
];
export const RESERVED_PREFIX = 'cf_';

export interface ClientItem {
    id: number;
    name: string;
    logo_url: string | null;
    location: string | null;
    description: string | null;
    custom_fields: Record<string, unknown> | null;
    is_archived: boolean;
    job_count: number;
    created_at: string;
    updated_at: string;
}

export interface JobItem {
    id: string;
    organization_id: number | null;
    organization_name: string | null;
    title: string;
    slug: string;
    description: string | null;
    location: string | null;
    is_remote: boolean;
    contract_type: string | null;
    experience: string | null;
    salary_currency: string | null;
    salary_min: number | null;
    salary_max: number | null;
    salary_frequency: string | null;
    salary_negotiable: boolean;
    headcount: number;
    tags: string[] | null;
    custom_fields: Record<string, unknown> | null;
    status: string;
    is_published: boolean;
    career_page_url: string | null;
    candidates_count: number;
    created_at: string;
    updated_at: string;
}

export interface PipelineStage {
    id: string;
    name: string;
    rank: number;
    is_final: boolean;
    candidates_count: number;
}

export interface Pipeline {
    pipeline_id: string;
    pipeline_name: string;
    stages: PipelineStage[];
}

export interface CandidateItem {
    id: string;
    reference: string | null;
    full_name: string;
    email: string | null;
    phone: string | null;
    gender: string | null;
    birth_date: string | null;
    location: string | null;
    current_company: string | null;
    current_position: string | null;
    experience: string | null;
    notice_period: string | null;
    last_working_day: string | null;
    expected_salary: Record<string, unknown> | null;
    current_salary: Record<string, unknown> | null;
    linkedin_url: string | null;
    source: string | null;
    description: string | null;
    skills: string[] | null;
    custom_fields: Record<string, unknown> | null;
    resume_url: string | null;
    resume_file_name: string | null;
    applications_count: number;
    created_at: string;
    updated_at: string;
}

export interface ApplicationItem {
    id: string;
    candidate_id: string;
    candidate_name: string | null;
    candidate_reference: string | null;
    candidate_email: string | null;
    candidate_phone: string | null;
    job_id: string;
    job_title: string | null;
    organization_name: string | null;
    stage_id: string | null;
    stage_name: string | null;
    is_active: boolean;
    match_score: number | null;
    source: string | null;
    answers: Record<string, unknown> | null;
    has_resume: boolean;
    resume_file_name: string | null;
    created_at: string;
    updated_at: string;
}

export interface ActivityItem {
    id: string;
    title: string;
    activity_type: string;
    description: string | null;
    assignee_id: number | null;
    assignee_name: string | null;
    candidate_id: string | null;
    candidate_name: string | null;
    job_id: string | null;
    job_title: string | null;
    due_date: string | null;
    is_done: boolean;
    created_at: string;
    updated_at: string;
}

export interface NoteItem {
    id: string;
    content: string;
    author_id: number | null;
    author_name: string | null;
    created_at: string;
}

export interface LogItem {
    id: string;
    actor_name?: string | null;
    action: string;
    created_at: string;
}

export interface HrDashboardJob {
    id: string;
    title: string;
    slug: string;
    location: string | null;
    organization_name: string | null;
    contract_type: string | null;
    status: string;
    applications_count: number;
}

export interface HrRecentApplication {
    id: string;
    candidate_name: string;
    job_title: string;
    stage_name: string | null;
    has_resume: boolean;
    created_at: string;
}

export interface HrDashboardData {
    total_jobs: number;
    published_jobs: number;
    total_candidates: number;
    total_applications: number;
    active_applications: number;
    stages: { name: string; candidates_count: number }[];
    jobs: HrDashboardJob[];
    recent_applications: HrRecentApplication[];
}

export const hrDashboard = () => get<HrDashboardData>('/api/v1/admin/hr-dashboard');

export interface CareersSettings {
    enabled: boolean;
    company_name: string;
    company_logo_url: string;
    careers_url: string;
    about_message: string;
    notification_email: string;
    apply_form_fields: string[];
    success_message: string;
    already_applied_message: string;
    resume_note: string;
    require_consent: boolean;
    consent_message: string;
    privacy_policy_url: string;
    custom_fields: FieldDef[] | null;
}

export interface CareersJob {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    location: string | null;
    is_remote: boolean;
    contract_type: string | null;
    experience: string | null;
    salary_currency: string | null;
    salary_min: number | null;
    salary_max: number | null;
    salary_frequency: string | null;
    salary_negotiable: boolean;
    headcount: number;
    tags: string[];
    organization_id: number | null;
    organization_name: string | null;
    career_page_url: string | null;
    created_at: string;
}

export interface ApplyResult {
    created: boolean;
    already_applied: boolean;
    candidate_reference: string | null;
    candidate_id: string;
    job_id: string;
    resume_uploaded: boolean;
    message: string;
}

export interface ListResult<T> {
    items: T[];
    total: number;
}

export const CONTRACT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'];
export const SALARY_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'CAD', 'AUD'];
export const SALARY_FREQUENCIES = ['per month', 'per year', 'per hour', 'per day'];
export const ACTIVITY_TYPES = ['interview', 'call', 'email', 'task', 'note', 'follow-up'];
export const CANDIDATE_SOURCES = ['Careers Page', 'Referral', 'LinkedIn', 'Job Board', 'Walk-in', 'Other'];

// ---------------------------------------------------------------------------
// HTTP client
// ---------------------------------------------------------------------------

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const isFormData = options.body instanceof FormData;
    const token = tokenStorage.getToken();
    const headers: Record<string, string> = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            let message = `HTTP ${response.status}`;
            try {
                const data = await response.json();
                if (typeof data?.detail === 'string') message = data.detail;
                else if (Array.isArray(data?.detail)) {
                    message = data.detail.map((d: unknown) =>
                        typeof d === 'string' ? d : (d as { msg?: string }).msg ?? ''
                    ).filter(Boolean).join(', ');
                } else if (typeof data?.message === 'string') message = data.message;
            } catch {
                /* ignore parse failure */
            }
            throw new Error(message);
        }

        if (response.status === 204) return undefined as T;
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out. Is the backend running?');
        }
        throw error;
    }
}

const get = <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' });
const post = <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: body === undefined ? undefined : (body instanceof FormData ? body : JSON.stringify(body)) });
const put = <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: body === undefined ? undefined : (body instanceof FormData ? body : JSON.stringify(body)) });
const del = <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' });

async function requestBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = tokenStorage.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(url, { ...options, headers, signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            let message = `HTTP ${response.status}`;
            try {
                const data = await response.json();
                if (typeof data?.detail === 'string') message = data.detail;
                else if (Array.isArray(data?.detail)) {
                    message = data.detail.map((d: unknown) =>
                        typeof d === 'string' ? d : (d as { msg?: string }).msg ?? ''
                    ).filter(Boolean).join(', ');
                } else if (typeof data?.message === 'string') message = data.message;
            } catch {
                /* ignore parse failure */
            }
            throw new Error(message);
        }

        return await response.blob();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out. Is the backend running?');
        }
        throw error;
    }
}

// ---------------------------------------------------------------------------
// Admin API (authenticated — /api/v1)
// ---------------------------------------------------------------------------

export const clientsApi = {
    list: async (opts: { search?: string; archived?: boolean } = {}): Promise<ListResult<ClientItem>> => {
        const params = new URLSearchParams();
        if (opts.search) params.set('search', opts.search);
        if (opts.archived !== undefined) params.set('archived', String(opts.archived));
        const res = await get<{ clients: ClientItem[]; total: number }>(
            `/api/v1/clients${params.toString() ? `?${params.toString()}` : ''}`
        );
        return { items: res.clients, total: res.total };
    },
    create: (data: Partial<ClientItem>) => post<ClientItem>('/api/v1/clients', data),
    get: (id: number) => get<ClientItem>(`/api/v1/clients/${id}`),
    update: (id: number, data: Partial<ClientItem>) => put<ClientItem>(`/api/v1/clients/${id}`, data),
    remove: (id: number) => del<{ success?: boolean; message?: string }>(`/api/v1/clients/${id}`),
};

export const jobsApi = {
    list: async (opts: { search?: string; status?: string; organization_id?: number } = {}): Promise<ListResult<JobItem>> => {
        const params = new URLSearchParams();
        if (opts.search) params.set('search', opts.search);
        if (opts.status) params.set('status', opts.status);
        if (opts.organization_id !== undefined) params.set('organization_id', String(opts.organization_id));
        const res = await get<{ jobs: JobItem[]; total: number }>(
            `/api/v1/jobs${params.toString() ? `?${params.toString()}` : ''}`
        );
        return { items: res.jobs, total: res.total };
    },
    get: (id: string) => get<JobItem>(`/api/v1/jobs/${id}`),
    create: (data: Record<string, unknown>) => post<JobItem>('/api/v1/jobs', data),
    update: (id: string, data: Record<string, unknown>) => put<JobItem>(`/api/v1/jobs/${id}`, data),
    remove: (id: string) => del<{ success?: boolean; message?: string }>(`/api/v1/jobs/${id}`),
    setPublished: (id: string, is_published: boolean) =>
        post<JobItem>(`/api/v1/jobs/${id}/publish`, { is_published }),
    getPipeline: (id: string) => get<Pipeline>(`/api/v1/jobs/${id}/pipeline`),
    addStage: (id: string, name: string) =>
        post<PipelineStage>(`/api/v1/jobs/${id}/pipeline/stages`, { name }),
    removeStage: (id: string, stageId: string) =>
        del<{ deleted_id: string; name: string; moved_candidates: number }>(`/api/v1/jobs/${id}/pipeline/stages/${stageId}`),
};

export const candidatesApi = {
    list: async (opts: { search?: string; job_id?: string; page?: number; limit?: number } = {}): Promise<ListResult<CandidateItem>> => {
        const params = new URLSearchParams();
        if (opts.search) params.set('search', opts.search);
        if (opts.job_id !== undefined) params.set('job_id', String(opts.job_id));
        params.set('page', String(opts.page ?? 1));
        params.set('limit', String(opts.limit ?? 50));
        const res = await get<{ candidates: CandidateItem[]; total: number }>(
            `/api/v1/candidates?${params.toString()}`
        );
        return { items: res.candidates, total: res.total };
    },
    get: (id: string) => get<CandidateItem>(`/api/v1/candidates/${id}`),
    create: (data: Record<string, unknown>) => post<CandidateItem>('/api/v1/candidates', data),
    update: (id: string, data: Record<string, unknown>) => put<CandidateItem>(`/api/v1/candidates/${id}`, data),
    remove: (id: string) => del<{ success?: boolean; message?: string }>(`/api/v1/candidates/${id}`),
    uploadResume: async (id: string, file: File) => {
        const form = new FormData();
        form.append('file', file);
        return post<{ resume_url: string; resume_file_name: string; download_url: string }>(
            `/api/v1/candidates/${id}/resume`, form
        );
    },
    resumeUrl: (id: string) => get<{ url: string }>(`/api/v1/candidates/${id}/resume-url`),
    resume: (id: string) => requestBlob(`/api/v1/candidates/${id}/resume`),
    notes: async (id: string) => get<NoteItem[]>(`/api/v1/candidates/${id}/notes`),
    addNote: (id: string, content: string) =>
        post<NoteItem>(`/api/v1/candidates/${id}/notes`, { content }),
    deleteNote: (noteId: string) => del<{ success?: boolean }>(`/api/v1/candidates/notes/${noteId}`),
    logs: (id: string) => get<LogItem[]>(`/api/v1/candidates/${id}/logs`),
};

export const applicationsApi = {
    listByJob: async (jobId: string): Promise<ListResult<ApplicationItem>> => {
        const res = await get<{ applications: ApplicationItem[]; total: number }>(
            `/api/v1/applications/jobs/${jobId}`
        );
        return { items: res.applications, total: res.total };
    },
    listByCandidate: async (candidateId: string): Promise<ListResult<ApplicationItem>> => {
        const res = await get<{ applications: ApplicationItem[]; total: number }>(
            `/api/v1/applications/candidates/${candidateId}`
        );
        return { items: res.applications, total: res.total };
    },
    create: (data: { candidate_id: string; job_id: string; stage_id?: string; match_score?: number; source?: string }) =>
        post<ApplicationItem>('/api/v1/applications', data),
    update: (id: string, data: { stage_id?: string; is_active?: boolean; match_score?: number; source?: string }) =>
        put<ApplicationItem>(`/api/v1/applications/${id}`, data),
    remove: (id: string) => del<{ success?: boolean }>(`/api/v1/applications/${id}`),
    resume: (id: string) => requestBlob(`/api/v1/applications/${id}/resume`),
};

export const activitiesApi = {
    list: async (opts: { job_id?: string; candidate_id?: string; is_done?: boolean } = {}): Promise<ListResult<ActivityItem>> => {
        const params = new URLSearchParams();
        if (opts.job_id !== undefined) params.set('job_id', String(opts.job_id));
        if (opts.candidate_id !== undefined) params.set('candidate_id', String(opts.candidate_id));
        if (opts.is_done !== undefined) params.set('is_done', String(opts.is_done));
        const res = await get<{ activities: ActivityItem[]; total: number }>(
            `/api/v1/activities${params.toString() ? `?${params.toString()}` : ''}`
        );
        return { items: res.activities, total: res.total };
    },
    create: (data: Record<string, unknown>) => post<ActivityItem>('/api/v1/activities', data),
    update: (id: string, data: Record<string, unknown>) => put<ActivityItem>(`/api/v1/activities/${id}`, data),
    remove: (id: string) => del<{ success?: boolean }>(`/api/v1/activities/${id}`),
};

export const fieldsApi = {
    list: async (opts: { entity?: FieldEntity; include_deleted?: boolean } = {}): Promise<ListResult<FieldDef>> => {
        const params = new URLSearchParams();
        if (opts.entity) params.set('entity', opts.entity);
        if (opts.include_deleted) params.set('include_deleted', 'true');
        const res = await get<{ fields: FieldDef[]; total: number }>(
            `/api/v1/recruitment-fields${params.toString() ? `?${params.toString()}` : ''}`
        );
        return { items: res.fields, total: res.total };
    },
    create: (data: Record<string, unknown>) => post<FieldDef>('/api/v1/recruitment-fields', data),
    update: (id: string | number, data: Record<string, unknown>) => put<FieldDef>(`/api/v1/recruitment-fields/${id}`, data),
    remove: (id: string | number) =>
        del<{ deleted: boolean; field_id: string; code: string; label: string }>(`/api/v1/recruitment-fields/${id}`),
    restore: (id: string | number) => post<FieldDef>(`/api/v1/recruitment-fields/${id}/restore`),
    reorder: (entity: FieldEntity, codes: string[]) =>
        post<{ entity: string; reordered: number }>('/api/v1/recruitment-fields/reorder', { entity, codes }),
};

// ---------------------------------------------------------------------------
// Public careers API (no auth — /api/careers)
// ---------------------------------------------------------------------------

export const careersApi = {
    settings: () => get<CareersSettings>('/api/careers/settings'),
    jobs: async (): Promise<CareersJob[]> => {
        const res = await get<{ jobs: CareersJob[]; total: number }>('/api/careers/jobs');
        return res.jobs;
    },
    job: (slug: string) => get<CareersJob>(`/api/careers/jobs/${slug}`),
    apply: (slug: string, data: Record<string, string>) =>
        post<ApplyResult>(`/api/careers/jobs/${slug}/apply`, data),
    applyForm: async (slug: string, formData: FormData) => {
        return request<ApplyResult>(`/api/careers/jobs/${slug}/apply`, { method: 'POST', body: formData });
    },
};

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export function formatSalary(job: Pick<JobItem, 'salary_currency' | 'salary_min' | 'salary_max' | 'salary_negotiable' | 'salary_frequency'>): string {
    if (job.salary_min == null && job.salary_max == null) {
        return job.salary_negotiable ? 'Negotiable' : '—';
    }
    const currency = job.salary_currency ? `${job.salary_currency} ` : '';
    const min = job.salary_min != null ? `${currency}${formatNumber(job.salary_min)}` : '';
    const max = job.salary_max != null ? `${currency}${formatNumber(job.salary_max)}` : '';
    const range = min && max ? `${min} – ${max}` : min || max || '';
    const suffix = `${job.salary_frequency || ''}`;
    return `${range}${suffix ? ` /${suffix.replace('per ', '')}` : ''}`.trim();
}

function formatNumber(n: number): string {
    if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    return String(n);
}

export function initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

export function formatFieldValue(def: Pick<FieldDef, 'field_type'>, value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (def.field_type === 'multi_select') {
        const arr = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
        return arr.length ? arr.join(', ') : '—';
    }
    if (def.field_type === 'boolean') {
        const b = value === true || value === 'true' || value === 'on' || value === 'yes' || value === '1';
        return b ? 'Yes' : 'No';
    }
    return String(value);
}
/** Default CRM lead statuses (CRM settings workflow may extend this list). */
export const DEFAULT_LEAD_STATUSES = [
    'new lead',
    'assigned',
    'application sent',
    'application in',
    'nurture',
    'follow up',
    'on hold',
    'lost',
    'duplicate',
    'closed',
] as const;

export type LeadStatusOption = (typeof DEFAULT_LEAD_STATUSES)[number];

export function parseLeadStatusOptions(workflowCsv?: string): string[] {
    const fromCrm = (workflowCsv || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (fromCrm.length === 0) {
        return [...DEFAULT_LEAD_STATUSES];
    }
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const status of fromCrm) {
        const key = status.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            merged.push(status);
        }
    }
    for (const status of DEFAULT_LEAD_STATUSES) {
        const key = status.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            merged.push(status);
        }
    }
    return merged;
}

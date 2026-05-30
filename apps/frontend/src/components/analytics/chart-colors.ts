export const CHART_COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
] as const;

export const LEAD_STATUS_CHART_COLORS: Record<string, string> = {
    'New Leads': 'var(--chart-3)',
    'Application Sent': 'var(--chart-1)',
    'Application In': 'var(--chart-2)',
    'On Hold': 'var(--chart-4)',
    Lost: 'var(--chart-5)',
};

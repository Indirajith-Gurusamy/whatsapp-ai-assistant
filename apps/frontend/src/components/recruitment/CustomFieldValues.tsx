'use client';

import { FieldDef, formatFieldValue } from '@/lib/recruitment';

interface CustomFieldValuesProps {
    defs: FieldDef[];
    values?: Record<string, unknown> | null;
    columns?: 2 | 3;
}

export function CustomFieldValues({ defs, values, columns = 2 }: CustomFieldValuesProps) {
    if (!values || typeof values !== 'object') return null;
    const rows = defs
        .filter((d) => {
            const v = values[d.code];
            return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
        })
        .sort((a, b) => a.sort_order - b.sort_order);
    if (rows.length === 0) return null;
    return (
        <div className={columns === 3 ? 'grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3' : 'grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2'}>
            {rows.map((d) => (
                <div key={d.code}>
                    <p className="text-xs text-muted-foreground">{d.label}</p>
                    <p className="text-sm font-medium break-words">{formatFieldValue(d, values[d.code])}</p>
                </div>
            ))}
        </div>
    );
}
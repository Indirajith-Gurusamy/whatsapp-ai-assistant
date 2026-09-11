'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FieldDef } from '@/lib/recruitment';
import { cn } from '@/lib/utils';

function asString(value: unknown): string {
    if (Array.isArray(value) || value === null || value === undefined) return '';
    return String(value);
}

function asBoolean(value: unknown): boolean {
    return value === true || value === 'true' || value === 'on' || value === 'yes' || value === '1';
}

function asArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string' && value.trim()) return value.split(',');
    return [];
}

export interface CustomFieldControlProps {
    def: FieldDef;
    value: unknown;
    onChange: (value: unknown) => void;
    id?: string;
    disabled?: boolean;
    className?: string;
}

export function CustomFieldControl({ def, value, onChange, id, disabled, className }: CustomFieldControlProps) {
    const common = { id, disabled, className: cn('w-full', className) };

    switch (def.field_type) {
        case 'textarea':
            return (
                <Textarea
                    rows={3}
                    value={asString(value)}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    id={id}
                />
            );
        case 'boolean':
            return (
                <div className="flex items-center gap-2 py-1">
                    <Checkbox
                        checked={asBoolean(value)}
                        onCheckedChange={(checked) => onChange(checked === true)}
                        id={id}
                        disabled={disabled}
                    />
                    <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
                        {def.label}
                    </Label>
                </div>
            );
        case 'select':
            return (
                <Select
                    value={asString(value) || undefined}
                    onValueChange={(v) => onChange(v)}
                    disabled={disabled}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                        {(def.options || []).map((opt) => (
                            <SelectItem key={opt} value={opt}>
                                {opt}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        case 'multi_select':
            return (
                <div className="grid gap-1.5">
                    {(def.options || []).map((opt) => {
                        const selected = asArray(value).includes(opt);
                        return (
                            <label key={opt} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={selected}
                                    onCheckedChange={(c) => {
                                        const current = asArray(value);
                                        const next = c === true
                                            ? [...current, opt]
                                            : current.filter((v) => v !== opt);
                                        onChange(next);
                                    }}
                                    disabled={disabled}
                                />
                                <span className="cursor-pointer">{opt}</span>
                            </label>
                        );
                    })}
                </div>
            );
        case 'number':
            return (
                <Input
                    type="number"
                    value={asString(value)}
                    onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
                    {...common}
                />
            );
        case 'date':
            return (
                <Input
                    type="date"
                    value={asString(value)}
                    onChange={(e) => onChange(e.target.value)}
                    {...common}
                />
            );
        case 'url':
            return (
                <Input
                    type="url"
                    value={asString(value)}
                    onChange={(e) => onChange(e.target.value)}
                    {...common}
                />
            );
        case 'email':
            return (
                <Input
                    type="email"
                    value={asString(value)}
                    onChange={(e) => onChange(e.target.value)}
                    {...common}
                />
            );
        default:
            return (
                <Input
                    type="text"
                    value={asString(value)}
                    onChange={(e) => onChange(e.target.value)}
                    {...common}
                />
            );
    }
}

interface CustomFieldRowProps extends CustomFieldControlProps {
    def: FieldDef;
    value: unknown;
    onChange: (value: unknown) => void;
    id?: string;
    disabled?: boolean;
    className?: string;
    wrapperClassName?: string;
}

export function CustomFieldRow({ def, value, onChange, id, disabled, className, wrapperClassName }: CustomFieldRowProps) {
    if (def.field_type === 'boolean') {
        return (
            <div className={wrapperClassName}>
                <CustomFieldControl def={def} value={value} onChange={onChange} id={id} disabled={disabled} className={className} />
            </div>
        );
    }
    return (
        <div className={cn('space-y-1.5', wrapperClassName)}>
            <Label htmlFor={id}>
                {def.label}
                {def.required && <span className="text-destructive"> *</span>}
            </Label>
            <CustomFieldControl def={def} value={value} onChange={onChange} id={id} disabled={disabled} className={className} />
        </div>
    );
}
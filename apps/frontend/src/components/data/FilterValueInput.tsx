'use client';

import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';
import type { FilterValueOption } from '@/lib/table-filter';

const SEARCHABLE_THRESHOLD = 8;

interface FilterValueInputProps {
    kind: 'date' | 'text' | 'select';
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    options: FilterValueOption[];
    /** Shown when select has no options yet (e.g. loading team users). */
    selectPlaceholder?: string;
    className?: string;
}

export function FilterValueInput({
    kind,
    value,
    onChange,
    disabled = false,
    options,
    selectPlaceholder = 'Select value...',
    className,
}: FilterValueInputProps) {
    if (kind === 'date') {
        return (
            <Input
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className={cn(
                    'h-10 rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950',
                    disabled && 'cursor-not-allowed opacity-50',
                    className,
                )}
            />
        );
    }

    if (kind === 'select' && options.length > 0) {
        if (options.length >= SEARCHABLE_THRESHOLD) {
            return (
                <SearchableSelect
                    options={options}
                    value={value}
                    onChange={onChange}
                    placeholder={selectPlaceholder}
                    searchPlaceholder="Search values..."
                    emptyMessage="No matching values."
                    disabled={disabled}
                    className={cn(disabled && 'pointer-events-none opacity-50', className)}
                />
            );
        }

        return (
            <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger
                    className={cn(
                        'h-10 w-full rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950',
                        disabled && 'cursor-not-allowed opacity-50',
                        className,
                    )}
                >
                    <SelectValue placeholder={selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    return (
        <Input
            type="text"
            placeholder={options.length === 0 && kind === 'select' ? 'No values in table' : 'Enter value...'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={cn(
                'h-10 rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950',
                disabled && 'cursor-not-allowed opacity-50',
                className,
            )}
        />
    );
}

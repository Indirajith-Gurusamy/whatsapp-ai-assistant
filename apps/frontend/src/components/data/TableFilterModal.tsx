'use client';

import { useCallback, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { FilterValueInput } from '@/components/data/FilterValueInput';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
import {
    Dialog,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { FilterCondition, TableFilterField } from '@/lib/table-filter';
import type { FilterValueOption } from '@/lib/table-filter';
import {
    areAllFilterConditionsComplete,
    createDefaultCondition,
    dedupeFilterConditionsByField,
    fieldNeedsTeamUsers,
    getAvailableFieldsForRow,
    getFieldValueOptions,
    getFilterDraftValidationMessage,
    getNextAvailableField,
    getOperatorsForField,
    isConditionComplete,
    operatorNeedsValue,
    resolveValueInputKind,
} from '@/lib/table-filter';

export interface TableFilterModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fields: TableFilterField[];
    /** Current table rows used to populate value dropdowns. */
    data?: Record<string, unknown>[];
    appliedConditions: FilterCondition[];
    onApply: (conditions: FilterCondition[]) => void;
}

function FilterControlLabel({ children }: { children: React.ReactNode }) {
    return (
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {children}
        </span>
    );
}

interface FilterConditionRowProps {
    condition: FilterCondition;
    fieldOptions: TableFilterField[];
    data: Record<string, unknown>[];
    teamUsers: FilterValueOption[];
    onChange: (next: FilterCondition) => void;
    onRemove: () => void;
    canRemove: boolean;
}

function FilterConditionRow({
    condition,
    fieldOptions,
    data,
    teamUsers,
    onChange,
    onRemove,
    canRemove,
}: FilterConditionRowProps) {
    const fieldDef = fieldOptions.find((f) => f.key === condition.field) ?? fieldOptions[0];
    const operators = getOperatorsForField(fieldDef);
    const needsValue = operatorNeedsValue(condition.operator);
    const isComplete = isConditionComplete(condition, fieldOptions);
    const valueOptions = getFieldValueOptions(data, fieldDef, teamUsers);
    const valueInputKind = resolveValueInputKind(fieldDef, valueOptions);

    const handleFieldChange = (fieldKey: string) => {
        const nextField = fieldOptions.find((f) => f.key === fieldKey) ?? fieldOptions[0];
        const nextOps = getOperatorsForField(nextField);
        const operatorValid = nextOps.some((o) => o.value === condition.operator);
        onChange({
            field: fieldKey,
            operator: operatorValid ? condition.operator : nextOps[0].value,
            value: '',
        });
    };

    return (
        <div
            className={cn(
                'flex flex-col gap-3 rounded-xl border bg-gray-50/60 p-4 dark:bg-gray-900/40 sm:flex-row sm:items-end',
                isComplete
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-amber-200 dark:border-amber-800/60',
            )}
        >
            <div className="min-w-0 flex-1">
                <FilterControlLabel>Field</FilterControlLabel>
                <Select value={condition.field} onValueChange={handleFieldChange}>
                    <SelectTrigger className="h-10 w-full rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950">
                        <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                        {fieldOptions.map((f) => (
                            <SelectItem key={f.key} value={f.key}>
                                {f.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="min-w-0 flex-1">
                <FilterControlLabel>Operator</FilterControlLabel>
                <Select
                    value={condition.operator}
                    onValueChange={(operator) =>
                        onChange({
                            ...condition,
                            operator: operator as FilterCondition['operator'],
                        })
                    }
                >
                    <SelectTrigger className="h-10 w-full rounded-lg border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950">
                        <SelectValue placeholder="Select operator" />
                    </SelectTrigger>
                    <SelectContent>
                        {operators.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                                {op.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="min-w-0 flex-[1.2]">
                <FilterControlLabel>
                    Value{needsValue ? ' *' : ''}
                </FilterControlLabel>
                <FilterValueInput
                    kind={valueInputKind}
                    value={condition.value}
                    onChange={(value) => onChange({ ...condition, value })}
                    disabled={!needsValue}
                    options={valueOptions}
                    selectPlaceholder={
                        fieldDef?.optionsSource === 'team-users' && valueOptions.length === 0
                            ? 'Loading users...'
                            : 'Select value...'
                    }
                />
            </div>

            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRemove}
                disabled={!canRemove}
                className="h-10 w-10 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                aria-label="Remove filter"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}

export function TableFilterModal({
    open,
    onOpenChange,
    fields,
    data = [],
    appliedConditions,
    onApply,
}: TableFilterModalProps) {
    const [draft, setDraft] = useState<FilterCondition[]>(() =>
        dedupeFilterConditionsByField(
            appliedConditions.length > 0 ? appliedConditions : [],
        ),
    );

    const canAddMoreFilters = draft.length < fields.length;
    const canApplyFilters = areAllFilterConditionsComplete(draft, fields);
    const [teamUsers, setTeamUsers] = useState<FilterValueOption[]>([]);

    const loadTeamUsers = useCallback(async () => {
        if (!fieldNeedsTeamUsers(fields)) {
            setTeamUsers([]);
            return;
        }
        try {
            const response = await adminApi.getAllUsers(0, 100);
            setTeamUsers(
                response.users
                    .filter((u) => u.isActive)
                    .map((u) => ({
                        value: u.email,
                        label: `${u.name} (${u.email})`,
                    })),
            );
        } catch {
            setTeamUsers([]);
        }
    }, [fields]);

    const handleOpenChange = (next: boolean) => {
        if (next) {
            setDraft(
                dedupeFilterConditionsByField(
                    appliedConditions.length > 0 ? appliedConditions : [],
                ),
            );
            void loadTeamUsers();
        }
        onOpenChange(next);
    };

    const updateRow = (index: number, next: FilterCondition) => {
        setDraft((prev) => prev.map((row, i) => (i === index ? next : row)));
    };

    const removeRow = (index: number) => {
        setDraft((prev) => prev.filter((_, i) => i !== index));
    };

    const addRow = () => {
        setDraft((prev) => {
            const nextField = getNextAvailableField(fields, prev);
            if (!nextField) {
                toast.info('Each field can only be filtered once. Edit an existing row.');
                return prev;
            }
            return [...prev, createDefaultCondition(fields, nextField)];
        });
    };

    const handleCancel = () => {
        handleOpenChange(false);
    };

    const handleApply = () => {
        if (draft.length === 0) {
            onApply([]);
            handleOpenChange(false);
            return;
        }

        const validationMessage = getFilterDraftValidationMessage(draft, fields);
        if (validationMessage) {
            toast.error(validationMessage);
            return;
        }

        onApply(draft);
        handleOpenChange(false);
    };

    if (fields.length === 0) return null;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogPortal>
                <DialogOverlay className="backdrop-blur-sm bg-black/40" />
                <DialogPrimitive.Content
                    className={cn(
                        'fixed top-[50%] left-[50%] z-50 flex w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%]',
                        'max-h-[min(90vh,720px)] flex-col overflow-hidden rounded-3xl border bg-white shadow-xl',
                        'duration-200 outline-none dark:bg-gray-950 sm:max-w-2xl',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                    )}
                >
                    <div className="flex items-center justify-between border-b px-6 py-5 md:px-8">
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Filter
                        </DialogTitle>
                        <button
                            type="button"
                            onClick={() => handleOpenChange(false)}
                            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6 md:px-8">
                        {draft.map((condition, index) => (
                            <FilterConditionRow
                                key={index}
                                condition={condition}
                                fieldOptions={getAvailableFieldsForRow(fields, draft, index)}
                                data={data}
                                teamUsers={teamUsers}
                                onChange={(next) => updateRow(index, next)}
                                onRemove={() => removeRow(index)}
                                canRemove
                            />
                        ))}

                        <button
                            type="button"
                            onClick={addRow}
                            disabled={!canAddMoreFilters}
                            className={cn(
                                'flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 text-sm font-medium transition-colors',
                                canAddMoreFilters
                                    ? 'border-gray-200 text-violet-600 hover:border-violet-200 hover:bg-violet-50/50 dark:border-gray-700 dark:text-violet-400 dark:hover:border-violet-800 dark:hover:bg-violet-950/20'
                                    : 'cursor-not-allowed border-gray-100 text-gray-400 dark:border-gray-800 dark:text-gray-500',
                            )}
                        >
                            <Plus className="h-4 w-4" />
                            {draft.length === 0
                                ? 'Add Filter'
                                : canAddMoreFilters
                                  ? 'Add Filter'
                                  : 'All fields in use — edit a row above'}
                        </button>
                    </div>

                    <div className="flex items-center justify-between border-t px-6 py-5 md:px-8">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleCancel}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleApply}
                            disabled={draft.length > 0 && !canApplyFilters}
                            className="min-w-[160px] rounded-xl bg-[#1a1c2e] px-8 text-white hover:bg-[#252842] disabled:opacity-50 dark:bg-[#1a1c2e] dark:hover:bg-[#252842]"
                        >
                            Apply Filters
                        </Button>
                    </div>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
}

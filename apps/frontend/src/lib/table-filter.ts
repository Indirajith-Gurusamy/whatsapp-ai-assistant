export type FilterOperator =
    | 'contains'
    | 'equals'
    | 'not_equals'
    | 'starts_with'
    | 'ends_with'
    | 'is_empty'
    | 'is_not_empty'
    | 'before'
    | 'after'
    | 'on';

export interface FilterCondition {
    field: string;
    operator: FilterOperator;
    value: string;
}

export type TableFilterFieldType = 'text' | 'date' | 'number';

/** How the value control renders. `auto` = select from data when practical, else text. */
export type TableFilterValueInput = 'auto' | 'text' | 'select' | 'date';

/** Where select options come from (merged with table data when applicable). */
export type TableFilterOptionsSource = 'data' | 'team-users';

export interface TableFilterField {
    key: string;
    label: string;
    type?: TableFilterFieldType;
    valueInput?: TableFilterValueInput;
    /** Load assignable users (email values) for dropdown options. */
    optionsSource?: TableFilterOptionsSource;
    /** Known values (merged with distinct values from the current table dataset). */
    staticOptions?: string[];
    /** Resolve value from a row when the field is computed or nested. */
    getValue?: (item: Record<string, unknown>) => unknown;
}

export interface FilterValueOption {
    value: string;
    label: string;
}

const FREE_TEXT_FIELD_KEYS = new Set(['message', 'description', 'comments', 'title']);

const MAX_SELECT_OPTIONS = 500;

export interface FilterOperatorOption {
    value: FilterOperator;
    label: string;
}

const TEXT_OPERATORS: FilterOperatorOption[] = [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
];

const DATE_OPERATORS: FilterOperatorOption[] = [
    { value: 'on', label: 'On' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
];

const NUMBER_OPERATORS: FilterOperatorOption[] = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
];

export function getOperatorsForFieldType(type: TableFilterFieldType = 'text'): FilterOperatorOption[] {
    switch (type) {
        case 'date':
            return DATE_OPERATORS;
        case 'number':
            return NUMBER_OPERATORS;
        default:
            return TEXT_OPERATORS;
    }
}

export function getOperatorsForField(field: TableFilterField | undefined): FilterOperatorOption[] {
    return getOperatorsForFieldType(field?.type ?? 'text');
}

export function createDefaultCondition(
    fields: TableFilterField[],
    field?: TableFilterField,
): FilterCondition {
    const target = field ?? fields[0];
    const operators = getOperatorsForField(target);
    return {
        field: target?.key ?? '',
        operator: operators[0]?.value ?? 'contains',
        value: '',
    };
}

/** One condition per field — keeps the first occurrence of each field. */
export function dedupeFilterConditionsByField(conditions: FilterCondition[]): FilterCondition[] {
    const seen = new Set<string>();
    const deduped: FilterCondition[] = [];

    for (const condition of conditions) {
        if (!condition.field || seen.has(condition.field)) continue;
        seen.add(condition.field);
        deduped.push({ ...condition });
    }

    return deduped;
}

export function getUsedFieldKeys(
    conditions: FilterCondition[],
    excludeIndex?: number,
): Set<string> {
    const used = new Set<string>();
    conditions.forEach((c, i) => {
        if (excludeIndex !== undefined && i === excludeIndex) return;
        if (c.field) used.add(c.field);
    });
    return used;
}

export function getAvailableFieldsForRow(
    allFields: TableFilterField[],
    conditions: FilterCondition[],
    rowIndex: number,
): TableFilterField[] {
    const used = getUsedFieldKeys(conditions, rowIndex);
    const currentKey = conditions[rowIndex]?.field;
    return allFields.filter((f) => f.key === currentKey || !used.has(f.key));
}

export function getNextAvailableField(
    allFields: TableFilterField[],
    conditions: FilterCondition[],
): TableFilterField | undefined {
    const used = getUsedFieldKeys(conditions);
    return allFields.find((f) => !used.has(f.key));
}

export function operatorNeedsValue(operator: FilterOperator): boolean {
    return operator !== 'is_empty' && operator !== 'is_not_empty';
}

function formatFilterOptionLabel(fieldKey: string, value: string): string {
    if (fieldKey === 'isActive') {
        return value === 'active' ? 'Active' : 'Disabled';
    }
    if (fieldKey === 'role') {
        return value === 'ADMIN' ? 'Administrator' : value === 'USER' ? 'User' : value;
    }
    if (fieldKey === 'priority') {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }
    if (fieldKey === 'lead_status' || fieldKey === 'status') {
        return value
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    }
    return value;
}

export function getDistinctFieldValues(
    data: Record<string, unknown>[],
    field: TableFilterField,
): string[] {
    const seen = new Set<string>();
    for (const item of data) {
        const raw = resolveFieldValue(item, field);
        if (raw === null || raw === undefined) continue;
        const text = String(raw).trim();
        if (text) seen.add(text);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function getFieldValueOptions(
    data: Record<string, unknown>[],
    field: TableFilterField | undefined,
    teamUsers: FilterValueOption[] = [],
): FilterValueOption[] {
    if (!field) return [];

    const fromData = getDistinctFieldValues(data, field);
    const labelByValue = new Map<string, string>();

    for (const opt of teamUsers) {
        labelByValue.set(opt.value, opt.label);
    }

    const merged = new Set<string>([...(field.staticOptions ?? []), ...fromData]);
    if (field.optionsSource === 'team-users') {
        for (const opt of teamUsers) {
            merged.add(opt.value);
        }
    }

    const values = Array.from(merged)
        .filter((v) => v.length > 0)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        .slice(0, MAX_SELECT_OPTIONS);

    return values.map((value) => ({
        value,
        label: labelByValue.get(value) ?? formatFilterOptionLabel(field.key, value),
    }));
}

export function fieldNeedsTeamUsers(fields: TableFilterField[]): boolean {
    return fields.some((f) => f.optionsSource === 'team-users');
}

export function resolveValueInputKind(
    field: TableFilterField | undefined,
    options: FilterValueOption[],
): 'date' | 'text' | 'select' {
    if (!field) return 'text';

    if (field.valueInput === 'date' || field.type === 'date') return 'date';
    if (field.valueInput === 'text') return 'text';
    if (field.valueInput === 'select') {
        if (field.optionsSource === 'team-users') return 'select';
        if ((field.staticOptions?.length ?? 0) > 0) return 'select';
        return options.length > 0 ? 'select' : 'text';
    }

    if (FREE_TEXT_FIELD_KEYS.has(field.key)) return 'text';
    if (options.length > 0) return 'select';
    return 'text';
}

function normalizeText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase();
}

function parseDate(value: unknown): Date | null {
    if (value === null || value === undefined || value === '') return null;
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function resolveFieldValue(
    item: Record<string, unknown>,
    field: TableFilterField,
): unknown {
    if (field.getValue) return field.getValue(item);
    return item[field.key];
}

function matchesCondition(
    item: Record<string, unknown>,
    condition: FilterCondition,
    fields: TableFilterField[],
): boolean {
    const fieldDef = fields.find((f) => f.key === condition.field);
    if (!fieldDef) return true;

    const raw = resolveFieldValue(item, fieldDef);
    const fieldType = fieldDef.type ?? 'text';
    const { operator, value } = condition;

    if (fieldType === 'date') {
        const itemDate = parseDate(raw);
        if (operator === 'is_empty') return itemDate === null;
        if (operator === 'is_not_empty') return itemDate !== null;
        if (!operatorNeedsValue(operator)) return true;

        const filterDate = parseDate(value);
        if (!filterDate) return true;
        if (!itemDate) return false;

        const itemDay = startOfDay(itemDate).getTime();
        const filterDay = startOfDay(filterDate).getTime();

        switch (operator) {
            case 'on':
                return itemDay === filterDay;
            case 'before':
                return itemDay < filterDay;
            case 'after':
                return itemDay > filterDay;
            default:
                return true;
        }
    }

    const itemText = normalizeText(raw);
    const filterText = normalizeText(value);

    if (operator === 'is_empty') return itemText === '';
    if (operator === 'is_not_empty') return itemText !== '';
    if (!operatorNeedsValue(operator)) return true;
    if (!filterText) return false;

    switch (operator) {
        case 'contains':
            return itemText.includes(filterText);
        case 'equals':
            return itemText === filterText;
        case 'not_equals':
            return itemText !== filterText;
        case 'starts_with':
            return itemText.startsWith(filterText);
        case 'ends_with':
            return itemText.endsWith(filterText);
        default:
            return true;
    }
}

/** True when this condition row should be applied (has field, operator, and value if required). */
export function isConditionComplete(
    condition: FilterCondition,
    fields: TableFilterField[],
): boolean {
    if (!condition.field || !condition.operator) return false;
    if (!operatorNeedsValue(condition.operator)) return true;
    return condition.value.trim().length > 0;
}

/** Only conditions that are complete enough to affect the table. */
export function getApplicableFilterConditions(
    conditions: FilterCondition[],
    fields: TableFilterField[],
): FilterCondition[] {
    return conditions.filter((c) => isConditionComplete(c, fields));
}

export function areAllFilterConditionsComplete(
    conditions: FilterCondition[],
    fields: TableFilterField[],
): boolean {
    if (conditions.length === 0) return true;
    return conditions.every((c) => isConditionComplete(c, fields));
}

export function getFilterDraftValidationMessage(
    conditions: FilterCondition[],
    fields: TableFilterField[],
): string | null {
    if (conditions.length === 0) return null;

    const incomplete = conditions.filter((c) => !isConditionComplete(c, fields));
    if (incomplete.length === 0) return null;

    const labels = incomplete.map((c) => {
        const field = fields.find((f) => f.key === c.field);
        return field?.label ?? c.field;
    });

    if (labels.length === 1) {
        return `Select a value for "${labels[0]}" or use Is empty / Is not empty.`;
    }
    return `Complete each filter: ${labels.join(', ')}.`;
}

export function applyTableFilters<T extends object>(
    data: T[],
    conditions: FilterCondition[],
    fields: TableFilterField[],
): T[] {
    const active = getApplicableFilterConditions(conditions, fields);
    if (active.length === 0) return data;

    return data.filter((item) =>
        active.every((condition) =>
            matchesCondition(item as Record<string, unknown>, condition, fields),
        ),
    );
}

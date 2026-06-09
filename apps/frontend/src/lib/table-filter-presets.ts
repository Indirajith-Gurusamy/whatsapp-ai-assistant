import type { TableFilterField } from '@/lib/table-filter';

const LEAD_STATUS_OPTIONS = [
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
];

const TASK_STATUS_OPTIONS = ['todo', 'in_progress', 'review', 'completed', 'cancelled'];
const TASK_PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];
const USER_ROLE_OPTIONS = ['USER', 'ADMIN'];
const USER_ACTIVE_OPTIONS = ['active', 'disabled'];

export const customerFilterFields: TableFilterField[] = [
    { key: 'name', label: 'Name', type: 'text', valueInput: 'select' },
    { key: 'channel', label: 'Channel', type: 'text', valueInput: 'select', staticOptions: ['whatsapp', 'email'] },
    { key: 'phone', label: 'Phone', type: 'text', valueInput: 'select' },
    { key: 'email', label: 'Email', type: 'text', valueInput: 'select' },
    { key: 'lead_status', label: 'Status', type: 'text', valueInput: 'select', staticOptions: LEAD_STATUS_OPTIONS },
    { key: 'assigned_to', label: 'Assigned To', type: 'text', valueInput: 'select', optionsSource: 'team-users' },
    { key: 'message_time', label: 'Last Contact', type: 'date', valueInput: 'date' },
    { key: 'message', label: 'Last Message', type: 'text', valueInput: 'text' },
];

export const conversationFilterFields: TableFilterField[] = [
    { key: 'name', label: 'Name', type: 'text', valueInput: 'select' },
    { key: 'channel', label: 'Channel', type: 'text', valueInput: 'select', staticOptions: ['whatsapp', 'email'] },
    { key: 'phone', label: 'Phone', type: 'text', valueInput: 'select' },
    { key: 'email', label: 'Email', type: 'text', valueInput: 'select' },
    { key: 'lead_status', label: 'Status', type: 'text', valueInput: 'select', staticOptions: LEAD_STATUS_OPTIONS },
    { key: 'message_time', label: 'Last Contact', type: 'date', valueInput: 'date' },
    { key: 'message', label: 'Message', type: 'text', valueInput: 'text' },
    { key: 'assigned_to', label: 'Assigned To', type: 'text', valueInput: 'select', optionsSource: 'team-users' },
];

export const messageFilterFields: TableFilterField[] = [
    { key: 'name', label: 'Name', type: 'text', valueInput: 'select' },
    { key: 'channel', label: 'Channel', type: 'text', valueInput: 'select', staticOptions: ['whatsapp', 'email'] },
    { key: 'phone', label: 'Phone', type: 'text', valueInput: 'select' },
    { key: 'email', label: 'Email', type: 'text', valueInput: 'select' },
    { key: 'message', label: 'Message', type: 'text', valueInput: 'text' },
    { key: 'timestamp', label: 'Timestamp', type: 'date', valueInput: 'date' },
];

export const taskFilterFields: TableFilterField[] = [
    { key: 'title', label: 'Title', type: 'text', valueInput: 'select' },
    { key: 'description', label: 'Description', type: 'text', valueInput: 'text' },
    { key: 'status', label: 'Status', type: 'text', valueInput: 'select', staticOptions: TASK_STATUS_OPTIONS },
    { key: 'priority', label: 'Priority', type: 'text', valueInput: 'select', staticOptions: TASK_PRIORITY_OPTIONS },
    { key: 'assigned_to', label: 'Assigned To', type: 'text', valueInput: 'select', optionsSource: 'team-users' },
    { key: 'due_date', label: 'Due Date', type: 'date', valueInput: 'date' },
    { key: 'created_at', label: 'Created At', type: 'date', valueInput: 'date' },
];

export const adminUserFilterFields: TableFilterField[] = [
    { key: 'name', label: 'Name', type: 'text', valueInput: 'select' },
    { key: 'email', label: 'Email', type: 'text', valueInput: 'select' },
    {
        key: 'role',
        label: 'Role',
        type: 'text',
        valueInput: 'select',
        staticOptions: USER_ROLE_OPTIONS,
        getValue: (item) => String(item.role ?? ''),
    },
    {
        key: 'isActive',
        label: 'Status',
        type: 'text',
        valueInput: 'select',
        staticOptions: USER_ACTIVE_OPTIONS,
        getValue: (item) => (item.isActive ? 'active' : 'disabled'),
    },
    { key: 'lastLogin', label: 'Last Login', type: 'date', valueInput: 'date' },
    { key: 'createdAt', label: 'Created At', type: 'date', valueInput: 'date' },
];

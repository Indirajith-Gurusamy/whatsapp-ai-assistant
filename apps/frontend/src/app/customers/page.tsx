'use client';

import { useState } from 'react';
import { useCustomers } from '@/hooks/useCustomers';
import { useTeamUsers } from '@/hooks/useTeamUsers';
import { useAuth } from '@/contexts/AuthContext';
import { customersApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { FloatingInput } from '@/components/ui/floating-input';
import { ShieldAlert } from 'lucide-react';
import { AssigneeCell } from '@/components/data/AssigneeCell';
import { formatAssigneeLabel } from '@/lib/assignee';
import { DataTable } from '@/components/data/DataTable';
import { ListPageSkeleton } from '@/components/data/ListPageSkeleton';
import { StatusBadge } from '@/components/data/StatusBadge';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye } from 'lucide-react';
import type { Customer } from '@/types';
import { useRouter } from 'next/navigation';
import { ListPageShell } from '@/components/data/ListPageShell';
import { customerFilterFields } from '@/lib/table-filter-presets';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const categoryKeywords: Record<string, string[]> = {
    'Loan': ['loan', 'credit', 'borrow', 'finance', 'lending'],
    'Insurance': ['insurance', 'policy', 'coverage', 'claim', 'premium'],
    'Investment': ['invest', 'portfolio', 'returns', 'mutual fund', 'stocks'],
    'Savings': ['savings', 'deposit', 'save', 'emergency fund'],
    'Business': ['business', 'startup', 'venture', 'capital', 'entrepreneur'],
    'Education': ['education', 'fees', 'school', 'college', 'university'],
    'Property': ['property', 'real estate', 'house', 'home', 'mortgage'],
    'Consultation': ['help', 'advice', 'consult', 'question', 'enquir'],
};

const categoryColors: Record<string, string> = {
    'Loan': 'bg-blue-50 text-blue-700 border-blue-100',
    'Insurance': 'bg-orange-50 text-orange-700 border-orange-100',
    'Investment': 'bg-purple-50 text-purple-700 border-purple-100',
    'Savings': 'bg-amber-50 text-amber-700 border-amber-100',
    'Business': 'bg-amber-50 text-amber-800 border-amber-100',
    'Education': 'bg-lime-50 text-lime-800 border-lime-100',
    'Property': 'bg-pink-50 text-pink-700 border-pink-100',
    'Consultation': 'bg-gray-50 text-gray-600 border-gray-200',
    'General': 'bg-gray-50 text-gray-600 border-gray-200',
};

function categorizeCustomer(message: string | null): string {
    if (!message) return 'General';
    const msg = message.toLowerCase();

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => msg.includes(keyword))) {
            return category;
        }
    }

    return 'General';
}

function formatDate(dateString: string | null | undefined): { date: string; time: string } {
    if (!dateString) return { date: '-', time: '' };
    const date = new Date(dateString);
    return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
}

export default function CustomersPage() {
    const { customers, isLoading, refresh } = useCustomers();
    const { isAdmin, isLoading: authLoading, user } = useAuth();
    const { emailToName } = useTeamUsers(isAdmin());
    const router = useRouter();
    const [addOpen, setAddOpen] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    const [newName, setNewName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleViewDetails = (customer: Customer) => {
        router.push(`/customers/${customer.uuid}`);
    };

    const handleAdd = () => {
        if (!isAdmin()) {
            toast.error('Admin access required');
            return;
        }
        setNewPhone('');
        setNewName('');
        setAddOpen(true);
    };

    const handleCreateCustomer = async () => {
        const phone = newPhone.trim();
        if (!phone) {
            toast.error('Phone number is required');
            return;
        }
        setIsCreating(true);
        try {
            const result = await customersApi.create({ phone, name: newName.trim() || undefined });
            toast.success(result.created ? 'Customer created' : 'Customer already exists');
            setAddOpen(false);
            await refresh();
            if (result.uuid) router.push(`/customers/${result.uuid}`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to create customer');
        } finally {
            setIsCreating(false);
        }
    };

    const handleExport = () => {
        if (customers.length === 0) {
            toast.error('No customers to export');
            return;
        }
        const header = 'Name,Phone,Category,Lead Status,Assigned To,Last Message Time\n';
        const rows = customers
            .map((c) => {
                const category = categorizeCustomer(c.message);
                const name = (c.name || 'Unnamed').replace(/"/g, '""');
                const assignee = formatAssigneeLabel(c.assigned_to, emailToName, user?.email);
                return `"${name}","${c.phone}","${category}","${c.lead_status}","${assignee}","${c.message_time}"`;
            })
            .join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'customers.csv';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Customers exported');
    };

    const columns = [
        {
            key: 'name',
            header: 'NAME',
            cell: (item: Customer) => (
                <span className="font-medium text-gray-900 dark:text-gray-100">
                    {item.name || 'Unnamed'}
                </span>
            ),
        },
        {
            key: 'phone',
            header: 'PHONE',
            cell: (item: Customer) => (
                <span className="text-gray-600 dark:text-gray-400 tabular-nums">
                    +{item.phone}
                </span>
            ),
        },
        {
            key: 'category',
            header: 'CATEGORY',
            cell: (item: Customer) => {
                const category = categorizeCustomer(item.message);
                return (
                    <Badge
                        variant="outline"
                        className={cn(
                            'font-medium text-xs uppercase tracking-wide border',
                            categoryColors[category],
                        )}
                    >
                        {category}
                    </Badge>
                );
            },
        },
        {
            key: 'status',
            header: 'STATUS',
            cell: (item: Customer) => <StatusBadge status={item.lead_status} />,
        },
        {
            key: 'assigned_to',
            header: 'ASSIGNED TO',
            cell: (item: Customer) => (
                <AssigneeCell
                    email={item.assigned_to}
                    emailToName={emailToName}
                    currentUserEmail={user?.email}
                />
            ),
            className: 'hidden md:table-cell',
        },
        {
            key: 'created',
            header: 'LAST CONTACT',
            cell: (item: Customer) => {
                const { date, time } = formatDate(item.message_time);
                return (
                    <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{date}</div>
                        {time && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{time}</div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'actions',
            header: 'ACTIONS',
            cell: (item: Customer) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Row actions"
                        >
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(item);
                            }}
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            className: 'w-[72px] text-right',
        },
    ];

    if (authLoading || isLoading) {
        return <ListPageSkeleton columns={7} />;
    }

    if (!isAdmin()) {
        return (
            <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
                <p className="text-gray-500 mb-6">Only administrators can view customers.</p>
                <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            </div>
        );
    }

    return (
        <ListPageShell>
            <DataTable
                className="flex flex-1 flex-col min-h-0"
                data={customers.map((c) => ({ ...c, id: c.uuid }))}
                columns={columns}
                onRowClick={handleViewDetails}
                searchPlaceholder="Search..."
                addLabel="Add"
                onAdd={handleAdd}
                onExport={handleExport}
                searchFields={['name', 'phone', 'assigned_to'] as (keyof Customer)[]}
                emptyMessage="No customers found"
                filterFields={customerFilterFields}
            />
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add customer</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <FloatingInput
                            label="Phone (with country code)"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                        />
                        <FloatingInput
                            label="Name (optional)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateCustomer} disabled={isCreating}>
                            {isCreating ? 'Creating…' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ListPageShell>
    );
}

'use client';

import { useCustomers } from '@/hooks/useCustomers';
import { DataTable } from '@/components/data/DataTable';
import { ListPageSkeleton } from '@/components/data/ListPageSkeleton';
import { StatusBadge } from '@/components/data/StatusBadge';
import { Button } from '@/components/ui/button';
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
    const { customers, isLoading } = useCustomers();
    const router = useRouter();

    const handleViewDetails = (customer: Customer) => {
        router.push(`/customers/${customer.uuid}`);
    };

    const handleAdd = () => {
        toast.info('Add customer is not available yet.');
    };

    const handleExport = () => {
        if (customers.length === 0) {
            toast.error('No customers to export');
            return;
        }
        const header = 'Name,Phone,Category,Lead Status,Last Message Time\n';
        const rows = customers
            .map((c) => {
                const category = categorizeCustomer(c.message);
                const name = (c.name || 'Unnamed').replace(/"/g, '""');
                return `"${name}","${c.phone}","${category}","${c.lead_status}","${c.message_time}"`;
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

    if (isLoading) {
        return <ListPageSkeleton columns={6} />;
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
                searchFields={['name', 'phone'] as (keyof Customer)[]}
                emptyMessage="No customers found"
                filterFields={customerFilterFields}
            />
        </ListPageShell>
    );
}

'use client';

import { useCustomers } from '@/hooks/useCustomers';
import { DataTable } from '@/components/data/DataTable';
import { TableSkeleton } from '@/components/data/TableSkeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Edit, Trash2 } from 'lucide-react';
import type { Customer } from '@/types';
import { useRouter } from 'next/navigation';
import { themeClasses } from '@/lib/theme';

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
    'Loan': 'bg-blue-100 text-blue-800',
    'Insurance': themeClasses.badgePrimary,
    'Investment': 'bg-purple-100 text-purple-800',
    'Savings': themeClasses.badgePrimary,
    'Business': 'bg-amber-100 text-amber-800',
    'Education': 'bg-lime-100 text-lime-800',
    'Property': 'bg-pink-100 text-pink-800',
    'Consultation': 'bg-gray-100 text-gray-800',
    'General': 'bg-gray-100 text-gray-600',
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

    const handleEdit = (customer: Customer) => {
        console.log('Edit customer:', customer);
    };

    const handleDelete = (customer: Customer) => {
        console.log('Delete customer:', customer);
    };

    const handleAdd = () => {
        console.log('Add new customer');
    };

    const handleExport = () => {
        console.log('Export customers');
    };

    const columns = [
        {
            key: 'name',
            header: 'Name',
            cell: (item: Customer) => (
                <span className="text-indigo-600 hover:text-indigo-800 font-medium">
                    {item.name || 'Unnamed'}
                </span>
            ),
        },
        {
            key: 'phone',
            header: 'Phone',
            cell: (item: Customer) => (
                <span className="text-muted-foreground">+{item.phone}</span>
            ),
        },
        {
            key: 'category',
            header: 'Category',
            cell: (item: Customer) => {
                const category = categorizeCustomer(item.message);
                return (
                    <Badge className={`${categoryColors[category]} font-medium text-xs`}>
                        {category}
                    </Badge>
                );
            },
        },
        {
            key: 'status',
            header: 'Status',
            cell: () => (
                <Badge className="bg-emerald-100 text-emerald-700 text-xs font-medium">
                    Active
                </Badge>
            ),
        },
        {
            key: 'created',
            header: 'Created',
            cell: (item: Customer) => {
                const { date, time } = formatDate(item.message_time);
                return (
                    <div className="text-right">
                        <div className="font-medium text-sm">{date}</div>
                        <div className="text-xs text-muted-foreground">{time}</div>
                    </div>
                );
            },
            className: 'text-right',
        },
        {
            key: 'actions',
            header: '',
            cell: (item: Customer) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
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
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(item);
                            }}
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item);
                            }}
                            className="text-red-600"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            className: 'w-12',
        },
    ];

    if (isLoading) {
        return (
            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
                <TableSkeleton columns={5} rows={10} title="Customers" />
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
            <DataTable
                data={customers.map(c => ({ ...c, id: c.uuid }))}
                columns={columns}
                onRowClick={handleViewDetails}
                title="Customers"
                searchPlaceholder="Search"
                onAdd={handleAdd}
                onExport={handleExport}
                searchFields={['name', 'phone'] as (keyof Customer)[]}
            />
        </div>
    );
}

'use client';

import { useCustomers } from '@/hooks/useCustomers';
import { DataTable } from '@/components/data/DataTable';
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
    'Insurance': 'bg-green-100 text-green-800',
    'Investment': 'bg-purple-100 text-purple-800',
    'Savings': 'bg-orange-100 text-orange-800',
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

export default function CustomersPage() {
    const { customers, isLoading } = useCustomers();
    const router = useRouter();

    const handleViewDetails = (customer: Customer) => {
        router.push(`/customers/${customer.customer_id}?phone=${encodeURIComponent(customer.phone)}`);
    };

    const handleEdit = (customer: Customer) => {
        // TODO: Implement edit functionality
        console.log('Edit customer:', customer);
    };

    const handleDelete = (customer: Customer) => {
        // TODO: Implement delete functionality
        console.log('Delete customer:', customer);
    };

    const columns = [
        {
            key: 'name',
            header: 'Name',
            cell: (item: Customer) => (
                <div className="font-medium">{item.name || 'User'}</div>
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
                    <Badge className={`${categoryColors[category]} font-medium`}>
                        {category}
                    </Badge>
                );
            },
        },
        {
            key: 'actions',
            header: 'Actions',
            cell: (item: Customer) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreVertical className="h-4 w-4" />
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
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">Customers</h1>
                <p className="text-muted-foreground">Unique customers and their enquiries</p>
            </div>

            {/* Data Table */}
            <DataTable
                data={customers.map(c => ({ ...c, id: c.customer_id }))}
                columns={columns}
                onRowClick={handleViewDetails}
            />
        </div>
    );
}

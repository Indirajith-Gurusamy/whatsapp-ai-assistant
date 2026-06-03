'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageBreadcrumbProps {
    href: string;
    label: string;
    className?: string;
}

export function PageBreadcrumb({ href, label, className }: PageBreadcrumbProps) {
    return (
        <Link
            href={href}
            className={cn(
                'inline-flex min-w-0 items-center gap-2 text-sm font-medium',
                'text-orange-600 transition-colors hover:text-orange-700',
                'dark:text-orange-400 dark:hover:text-orange-300',
                className,
            )}
        >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
        </Link>
    );
}

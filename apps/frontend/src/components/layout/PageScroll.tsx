import { cn } from '@/lib/utils';

/** Standard scrollable page wrapper inside DashboardLayout */
export const pageScrollClass =
    'flex-1 min-h-0 overflow-y-auto custom-scrollbar';

interface PageScrollProps {
    children: React.ReactNode;
    className?: string;
}

export function PageScroll({ children, className }: PageScrollProps) {
    return (
        <div className={cn(pageScrollClass, className)}>
            {children}
        </div>
    );
}

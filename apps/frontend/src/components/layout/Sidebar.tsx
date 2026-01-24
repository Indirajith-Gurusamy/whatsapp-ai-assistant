'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard,
    MessageSquare,
    Mail,
    Users,
    BarChart3,
    AlignLeft,
    Menu,
    Shield,
} from 'lucide-react';

const commonNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/conversations', label: 'Leads', icon: MessageSquare },
];

const adminNavItems = [
    { href: '/messages', label: 'Messages', icon: Mail },
    { href: '/customers', label: 'Customers', icon: Users },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/panel', label: 'Admin Panel', icon: Shield },
    { href: '/admin/users', label: 'User Management', icon: Users },
];

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
}

function SidebarContent({ collapsed, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
    const pathname = usePathname();
    const { isAdmin } = useAuth();

    const navItems = [
        ...commonNavItems,
        ...(isAdmin() ? adminNavItems : []),
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className={cn(
                "flex items-center px-4 py-6 border-b border-border/50 whitespace-nowrap flex-nowrap",
                collapsed ? "justify-center" : "justify-between gap-2"
            )}>
                <div className={cn(
                    "flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out",
                    collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                )}>
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg">
                        <MessageSquare className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-base bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent truncate whitespace-nowrap">
                        WhatsApp AI
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className={cn(
                        "shrink-0 transition-all duration-300",
                        !collapsed
                            ? "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl w-10 h-10 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.1)] active:scale-95"
                            : "w-10 h-10 rounded-xl hover:bg-emerald-500/10 text-emerald-600 transition-colors"
                    )}
                >
                    <AlignLeft className={cn("w-5 h-5", !collapsed ? "text-emerald-600" : "text-emerald-500")} />
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4">
                <div className={cn(
                    "overflow-hidden transition-opacity duration-300 ease-in-out mb-4 h-5",
                    collapsed ? "opacity-0" : "opacity-100"
                )}>
                    <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider whitespace-nowrap">
                        Main Menu
                    </p>
                </div>
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        const Icon = item.icon;

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex-nowrap",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        isActive && "bg-emerald-500/10 text-emerald-600 shadow-sm",
                                        collapsed && "justify-center px-2"
                                    )}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <Icon className={cn("w-5 h-5 flex-shrink-0 transition-colors duration-200", isActive && "text-emerald-500")} />
                                    <span className={cn(
                                        "whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-300 ease-in-out",
                                        collapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"
                                    )}>
                                        {item.label}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
    return (
        <aside
            className={cn(
                "hidden lg:flex flex-col bg-card border-r border-border/50 transition-all duration-300 overflow-hidden",
                collapsed ? "w-16" : "w-56"
            )}
        >
            <SidebarContent collapsed={collapsed} onToggle={onToggle} />
        </aside>
    );
}

export function MobileSidebar() {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground hover:text-foreground">
                    <Menu className="w-5 h-5" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[16rem] sm:w-[16rem] p-0" hideClose>
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SidebarContent onToggle={() => setOpen(false)} />
            </SheetContent>
        </Sheet>
    );
}

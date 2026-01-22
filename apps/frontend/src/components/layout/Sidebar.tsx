'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
    MessageSquare,
    Mail,
    Users,
    BarChart3,
    AlignLeft,
    Menu,
} from 'lucide-react';

const navItems = [
    { href: '/conversations', label: 'Conversations', icon: MessageSquare },
    { href: '/messages', label: 'Messages', icon: Mail },
    { href: '/customers', label: 'Customers', icon: Users },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
}

function SidebarContent({ collapsed, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className={cn(
                "flex items-center px-4 py-6 border-b border-border/50",
                collapsed ? "justify-center" : "justify-between gap-2"
            )}>
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg">
                            <MessageSquare className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-base bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent truncate">
                            WhatsApp AI
                        </span>
                    </div>
                )}
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
                <p className={cn(
                    "text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-4",
                    collapsed && "sr-only"
                )}>
                    Main Menu
                </p>
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        const Icon = item.icon;

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        isActive && "bg-emerald-500/10 text-emerald-600 shadow-sm",
                                        collapsed && "justify-center px-2"
                                    )}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-emerald-500")} />
                                    {!collapsed && <span>{item.label}</span>}
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
                "hidden lg:flex flex-col bg-card border-r border-border/50 transition-all duration-300",
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
            <SheetContent side="left" className="w-64 p-0">
                <SidebarContent onToggle={() => setOpen(false)} />
            </SheetContent>
        </Sheet>
    );
}

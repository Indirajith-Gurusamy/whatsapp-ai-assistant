'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { closeAssistant, NAV_PENDING_ATTR, VIVAFY_PAGE_READY_EVENT } from '@/lib/ui-actions';
import { isMainContentReady } from '@/components/layout/PageReadyWatcher';
import { themeClasses } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useIsClient } from '@/hooks/useIsClient';
import {
    LayoutDashboard,
    MessageSquare,
    Mail,
    Users,
    AlignLeft,
    Menu,
} from 'lucide-react';

const commonNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/conversations', label: 'Leads', icon: MessageSquare },
];

const adminNavItems = [
    { href: '/messages', label: 'Messages', icon: Mail },
    { href: '/customers', label: 'Customers', icon: Users },
    { href: '/admin/users', label: 'User Management', icon: Users },
];

/** Match SheetContent close animation duration (ms). */
const MOBILE_NAV_CLOSE_MS = 300;
/** Fallback if page-ready never fires (slow network, unmarked pages). */
const MOBILE_NAV_FALLBACK_MS = 1000;

function hrefMatchesPath(href: string, path: string): boolean {
    return path === href || path.startsWith(`${href}/`);
}

function setMainNavPending(pending: boolean): void {
    const main = document.querySelector('main');
    if (!main) return;
    if (pending) main.setAttribute(NAV_PENDING_ATTR, 'true');
    else main.removeAttribute(NAV_PENDING_ATTR);
}

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
}

function SidebarContent({
    collapsed,
    onToggle,
    onNavClick,
    pendingNavHref,
}: {
    collapsed?: boolean;
    onToggle?: () => void;
    onNavClick?: (href: string) => void;
    pendingNavHref?: string | null;
}) {
    const pathname = usePathname();
    const { isAdmin, isLoading } = useAuth();
    const mounted = useIsClient();

    // Only show common items until mounted and auth is loaded to prevent hydration mismatch
    const navItems = mounted && !isLoading
        ? [...commonNavItems, ...(isAdmin() ? adminNavItems : [])]
        : commonNavItems;

    return (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className={cn(
                "flex items-center px-4 py-3 border-b border-border/50 whitespace-nowrap flex-nowrap min-h-[57px]",
                collapsed ? "justify-center" : "justify-between gap-2"
            )}>
                <div className={cn(
                    "flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out",
                    collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                )}>
                    <div className={cn("flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-white shadow-lg", themeClasses.sidebarGradient)}>
                        <MessageSquare className="w-4 h-4" />
                    </div>
                    <span className={cn("font-bold text-base truncate whitespace-nowrap", themeClasses.sidebarTextGradient)}>
                        Vivafy
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className={cn(
                        "shrink-0 transition-all duration-300",
                        !collapsed
                            ? cn("bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl w-10 h-10 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.1)] active:scale-95")
                            : cn("w-10 h-10 rounded-xl transition-colors", themeClasses.sidebarHover, themeClasses.textPrimary)
                    )}
                >
                    <AlignLeft className={cn("w-5 h-5", !collapsed ? themeClasses.textPrimary : themeClasses.sidebarIcon)} />
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        const Icon = item.icon;

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    onClick={(e) => {
                                        closeAssistant();
                                        if (!onNavClick) return;
                                        e.preventDefault();
                                        onNavClick(item.href);
                                    }}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex-nowrap",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        isActive && themeClasses.sidebarActive,
                                        isActive && "shadow-sm",
                                        pendingNavHref === item.href && "bg-accent/80 scale-[0.98] animate-pulse",
                                        collapsed && "justify-center px-2"
                                    )}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <Icon className={cn("w-5 h-5 flex-shrink-0 transition-colors duration-200", isActive && themeClasses.sidebarIcon)} />
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
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [pendingNavHref, setPendingNavHref] = useState<string | null>(null);
    const pendingNavRef = useRef<string | null>(null);
    const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearFallbackTimer = useCallback(() => {
        if (fallbackTimer.current) {
            clearTimeout(fallbackTimer.current);
            fallbackTimer.current = null;
        }
    }, []);

    const completePendingNav = useCallback(() => {
        if (!pendingNavRef.current) return;
        pendingNavRef.current = null;
        clearFallbackTimer();
        setMainNavPending(false);
        setPendingNavHref(null);
        setOpen(false);
    }, [clearFallbackTimer]);

    useEffect(() => {
        return () => clearFallbackTimer();
    }, [clearFallbackTimer]);

    const tryCompletePendingNav = useCallback(() => {
        const pending = pendingNavRef.current;
        if (!pending || !hrefMatchesPath(pending, pathname)) return;
        if (!isMainContentReady()) return;
        completePendingNav();
    }, [pathname, completePendingNav]);

    useEffect(() => {
        const onPageReady = () => tryCompletePendingNav();
        window.addEventListener(VIVAFY_PAGE_READY_EVENT, onPageReady);
        return () => window.removeEventListener(VIVAFY_PAGE_READY_EVENT, onPageReady);
    }, [tryCompletePendingNav]);

    useEffect(() => {
        if (!pendingNavRef.current) return;
        const raf = requestAnimationFrame(() => {
            requestAnimationFrame(tryCompletePendingNav);
        });
        return () => cancelAnimationFrame(raf);
    }, [pathname, tryCompletePendingNav]);

    const handleNavClick = useCallback(
        (href: string) => {
            if (hrefMatchesPath(href, pathname)) {
                setPendingNavHref(null);
                pendingNavRef.current = null;
                clearFallbackTimer();
                setMainNavPending(false);
                setOpen(false);
                return;
            }

            setPendingNavHref(href);
            pendingNavRef.current = href;
            setMainNavPending(true);
            clearFallbackTimer();
            fallbackTimer.current = setTimeout(completePendingNav, MOBILE_NAV_FALLBACK_MS);
            router.push(href);
        },
        [pathname, router, clearFallbackTimer, completePendingNav],
    );

    const handleOpenChange = useCallback(
        (nextOpen: boolean) => {
            setOpen(nextOpen);

            if (nextOpen) {
                clearFallbackTimer();
                pendingNavRef.current = null;
                setMainNavPending(false);
                setPendingNavHref(null);
                return;
            }

            // Overlay / header toggle dismiss — clear pending navigation.
            clearFallbackTimer();
            pendingNavRef.current = null;
            setMainNavPending(false);
            setPendingNavHref(null);
        },
        [clearFallbackTimer],
    );

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden text-muted-foreground hover:text-foreground"
                    onClick={closeAssistant}
                >
                    <Menu className="w-5 h-5" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent
                side="left"
                className="w-[16rem] sm:w-[16rem] p-0 data-[state=closed]:duration-300 data-[state=open]:duration-300 ease-in-out"
                hideClose
            >
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SidebarContent
                    onToggle={() => setOpen(false)}
                    onNavClick={handleNavClick}
                    pendingNavHref={pendingNavHref}
                />
            </SheetContent>
        </Sheet>
    );
}

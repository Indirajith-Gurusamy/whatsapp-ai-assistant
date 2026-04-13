'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MobileSidebar } from './Sidebar';
import { Settings, User, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { themeClasses } from '@/lib/theme';

export function TopBar() {
    const { logout, isAdmin } = useAuth();
    const { user, isLoading } = useCurrentUser();

    return (
        <header className="sticky top-0 z-40 flex items-center gap-4 px-4 md:px-6 py-3 bg-card/80 backdrop-blur-md border-b border-border/50">
            {/* Mobile Menu */}
            <MobileSidebar />

            <div className="flex-1" />

            {/* Actions */}
            <div className="flex items-center gap-2">
                {/* Settings */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    asChild
                >
                    <Link href="/settings">
                        <Settings className="w-4 h-4" />
                        <span className="sr-only">Settings</span>
                    </Link>
                </Button>

                {/* Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex items-center gap-2 h-auto px-2 py-1.5 hover:bg-accent rounded-full"
                        >
                            <div className={`w-8 h-8 rounded-full ${themeClasses.bgPrimaryLight} flex items-center justify-center border-2 ${themeClasses.borderPrimaryLight}`}>
                                <User className={`w-4 h-4 ${themeClasses.textPrimary}`} />
                            </div>
                            <span className="sr-only">Profile</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" onClick={() => window.location.href = '/profile'}>
                            <User className="mr-2 h-4 w-4" />
                            <span>My Profile</span>
                        </DropdownMenuItem>
                        {isAdmin() && (
                            <DropdownMenuItem className="cursor-pointer" onClick={() => window.location.href = '/admin/panel'}>
                                <Shield className="mr-2 h-4 w-4" />
                                <span>Admin Panel</span>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="cursor-pointer" onClick={() => window.location.href = '/settings/sessions'}>
                            <Shield className="mr-2 h-4 w-4" />
                            <span>Active Sessions</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 cursor-pointer focus:text-red-600" onClick={logout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sign Out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

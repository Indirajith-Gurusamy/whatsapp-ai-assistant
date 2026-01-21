'use client';

import { Button } from '@/components/ui/button';
import { MobileSidebar } from './Sidebar';
import { Settings, User, LogOut, Shield } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function TopBar() {
    const { logout } = useAuth();

    return (
        <header className="sticky top-0 z-40 flex items-center gap-4 px-4 md:px-6 py-3 bg-card/80 backdrop-blur-md border-b border-border/50">
            {/* Mobile Menu */}
            <MobileSidebar />

            <div className="flex-1" />

            {/* Actions */}
            <div className="flex items-center gap-2">
                {/* Notification Bell with Dropdown */}
                <NotificationBell />

                {/* Settings */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                >
                    <Settings className="w-4 h-4" />
                    <span className="sr-only">Settings</span>
                </Button>

                {/* Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground bg-muted/50 rounded-full"
                        >
                            <User className="w-4 h-4" />
                            <span className="sr-only">Profile</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>My Profile</span>
                        </DropdownMenuItem>
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

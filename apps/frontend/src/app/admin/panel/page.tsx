"use client";

import { useState, useEffect } from "react";
import { adminApi, UserListItem, AdminStatsResponse } from "@/lib/api";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { DataTable } from '@/components/data/DataTable';
import { TableSkeleton } from '@/components/data/TableSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, UserCog, Trash2 } from 'lucide-react';

export default function AdminPanelPage() {
    return (
        <AdminRoute>
            <AdminPanelContent />
        </AdminRoute>
    );
}

function AdminPanelContent() {
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [stats, setStats] = useState<AdminStatsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [newRole, setNewRole] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [usersData, statsData] = await Promise.all([
                adminApi.getAllUsers(0, 100),
                adminApi.getAdminStats()
            ]);
            setUsers(usersData.users);
            setStats(statsData);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to load data";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangeRole = async () => {
        if (!selectedUser || !newRole) return;

        try {
            setActionLoading(true);
            await adminApi.changeUserRole(selectedUser.id, newRole);
            await loadData();
            setShowRoleModal(false);
            setSelectedUser(null);
            setNewRole("");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to change role";
            alert(message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        try {
            setActionLoading(true);
            await adminApi.deleteUser(selectedUser.id);
            await loadData();
            setShowDeleteModal(false);
            setSelectedUser(null);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to delete user";
            alert(message);
        } finally {
            setActionLoading(false);
        }
    };

    const openRoleModal = (user: UserListItem) => {
        setSelectedUser(user);
        setNewRole(user.role);
        setShowRoleModal(true);
    };

    const openDeleteModal = (user: UserListItem) => {
        setSelectedUser(user);
        setShowDeleteModal(true);
    };

    const columns = [
        {
            key: 'user',
            header: 'User',
            cell: (item: UserListItem) => (
                <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.email}</div>
                </div>
            ),
        },
        {
            key: 'role',
            header: 'Role',
            cell: (item: UserListItem) => (
                <Badge variant={item.role === 'ADMIN' ? 'default' : 'secondary'}
                    className={item.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : ''}>
                    {item.role}
                </Badge>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (item: UserListItem) => (
                <Badge className={item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
                    {item.isActive ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            key: 'verified',
            header: 'Verified',
            cell: (item: UserListItem) => (
                <Badge className={item.emailVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
                    {item.emailVerified ? 'Yes' : 'No'}
                </Badge>
            ),
        },
        {
            key: 'created',
            header: 'Created',
            cell: (item: UserListItem) => (
                <span className="text-sm text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()}
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            cell: (item: UserListItem) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openRoleModal(item)}>
                            <UserCog className="mr-2 h-4 w-4" />
                            Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDeleteModal(item)} className="text-destructive">
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
            <div className="p-4 md:p-6 space-y-6">
                {/* Header skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-4 w-64" />
                </div>

                {/* Stats Cards skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-lg border bg-card p-6 space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                    ))}
                </div>

                {/* Table skeleton */}
                <TableSkeleton columns={6} rows={10} title="All Users" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">Admin Panel</h1>
                <p className="text-muted-foreground">Manage users and system settings</p>
            </div>

            {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-destructive">{error}</p>
                </div>
            )}

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="rounded-lg border bg-card p-6">
                        <p className="text-sm text-muted-foreground">Total Users</p>
                        <p className="text-3xl font-bold">{stats.total_users}</p>
                    </div>
                    <div className="rounded-lg border bg-card p-6">
                        <p className="text-sm text-muted-foreground">Admins</p>
                        <p className="text-3xl font-bold text-purple-600">{stats.total_admins}</p>
                    </div>
                    <div className="rounded-lg border bg-card p-6">
                        <p className="text-sm text-muted-foreground">Active Users</p>
                        <p className="text-3xl font-bold text-primary">{stats.total_active_users}</p>
                    </div>
                    <div className="rounded-lg border bg-card p-6">
                        <p className="text-sm text-muted-foreground">Verified Users</p>
                        <p className="text-3xl font-bold text-blue-600">{stats.total_verified_users}</p>
                    </div>
                </div>
            )}

            {/* Users Table using DataTable */}
            <DataTable
                data={users.map(u => ({ ...u, id: u.id }))}
                columns={columns}
                title="All Users"
                searchPlaceholder="Search users..."
                searchFields={['name', 'email'] as (keyof UserListItem)[]}
                showSelection={false}
            />

            {/* Role Change Modal */}
            <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Change User Role</DialogTitle>
                        <DialogDescription>
                            Change role for <strong className="text-foreground">{selectedUser?.name}</strong> ({selectedUser?.email})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Select
                            value={newRole}
                            onValueChange={setNewRole}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USER">USER</SelectItem>
                                <SelectItem value="ADMIN">ADMIN</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex gap-3 pt-4 border-t mt-4">
                        <Button
                            onClick={() => {
                                setShowRoleModal(false);
                                setSelectedUser(null);
                            }}
                            variant="secondary"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleChangeRole}
                            disabled={actionLoading}
                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                        >
                            {actionLoading ? "Changing..." : "Confirm"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong className="text-foreground">{selectedUser?.name}</strong> ({selectedUser?.email})?
                            <br />
                            <span className="text-sm mt-2 block">
                                This action cannot be undone. All user data, sessions, and profile will be permanently deleted.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 pt-4 border-t mt-4">
                        <Button
                            onClick={() => {
                                setShowDeleteModal(false);
                                setSelectedUser(null);
                            }}
                            variant="secondary"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteUser}
                            disabled={actionLoading}
                            variant="destructive"
                            className="flex-1"
                        >
                            {actionLoading ? "Deleting..." : "Delete User"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

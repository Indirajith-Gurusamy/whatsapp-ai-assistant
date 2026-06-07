"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi, authApi, UserListItem } from "@/lib/api";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ListPageSkeleton } from "@/components/data/ListPageSkeleton";
import { ListPageShell } from "@/components/data/ListPageShell";
import { ListPageToolbar, ToolbarActionLabel, toolbarInlineActionBtn } from "@/components/data/ListPageToolbar";
import { TableFilterModal } from "@/components/data/TableFilterModal";
import { applyTableFilters, type FilterCondition } from "@/lib/table-filter";
import { adminUserFilterFields } from "@/lib/table-filter-presets";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, MoreVertical, ShieldCheck, ShieldAlert, UserCheck, UserX, KeyRound, Trash2, Download, ChevronLeft, ChevronRight, User, Loader2 } from "lucide-react";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 10;

export default function AdminUsersPage() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading, user: currentUser } = useAuth();
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [resetPasswordTarget, setResetPasswordTarget] = useState<UserListItem | null>(null);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [deleteUserTarget, setDeleteUserTarget] = useState<UserListItem | null>(null);
    const [isDeletingUser, setIsDeletingUser] = useState(false);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState<FilterCondition[]>([]);

    const displayedUsers = useMemo(() => {
        return applyTableFilters(users, appliedFilters, adminUserFilterFields);
    }, [users, appliedFilters]);

    // New User Form State
    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        password: "",
        role: "USER"
    });

    const fetchUsers = useCallback(async (page: number = 1, search: string = "") => {
        setIsLoading(true);
        try {
            const skip = (page - 1) * ITEMS_PER_PAGE;
            const response = await adminApi.getAllUsers(skip, ITEMS_PER_PAGE, search);
            setUsers(response.users);
            setTotalUsers(response.total);
        } catch {
            toast.error("Failed to fetch users");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        fetchUsers(currentPage, debouncedSearch);
    }, [currentPage, debouncedSearch, fetchUsers]);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1);
        setSelectedUsers(new Set());
    };

    const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            await authApi.signup({
                name: newUser.name,
                email: newUser.email,
                password: newUser.password,
                role: newUser.role
            });

            toast.success("User created successfully!");
            setIsDialogOpen(false);
            setNewUser({ name: "", email: "", password: "", role: "USER" });
            fetchUsers(currentPage, debouncedSearch);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to create user");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteUserTarget) return;

        const userId = deleteUserTarget.id;
        setIsDeletingUser(true);
        setActionLoading(userId);
        try {
            await adminApi.deleteUser(userId);
            toast.success("User deleted successfully");
            setSelectedUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
            setDeleteUserTarget(null);
            fetchUsers(currentPage, debouncedSearch);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to delete user");
        } finally {
            setIsDeletingUser(false);
            setActionLoading(null);
        }
    };

    const handleRoleChange = async (userId: number, currentRole: string) => {
        const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
        setActionLoading(userId);
        try {
            await adminApi.changeUserRole(userId, newRole);
            toast.success(`User role updated to ${newRole}`);
            setUsers(users.map(u =>
                u.id === userId ? { ...u, role: newRole } : u
            ));
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to update role");
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        setActionLoading(userId);
        try {
            const response = await adminApi.toggleUserStatus(userId, newStatus);
            toast.success(response.message);
            setUsers(users.map(u =>
                u.id === userId ? { ...u, isActive: newStatus } : u
            ));
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to toggle user status");
        } finally {
            setActionLoading(null);
        }
    };

    const handleVerifyUser = async (userId: number) => {
        setActionLoading(userId);
        try {
            const response = await adminApi.verifyUser(userId);
            toast.success(response.message);
            setUsers(users.map(u =>
                u.id === userId ? { ...u, emailVerified: true } : u
            ));
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to verify user");
        } finally {
            setActionLoading(null);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedUsers.size === 0) return;

        const userIds = Array.from(selectedUsers).filter((id) => id !== currentUser?.id);
        if (userIds.length === 0) {
            toast.error("You cannot delete your own account");
            return;
        }

        setIsBulkDeleting(true);
        try {
            const result = await adminApi.bulkDeleteUsers(userIds);
            const deleted = result.deleted.length;
            const failed = result.errors.length;
            if (failed > 0) {
                toast.warning(`Deleted ${deleted} user(s); ${failed} could not be deleted`);
            } else {
                toast.success(`${deleted} user(s) deleted successfully`);
            }
            setSelectedUsers(new Set());
            setShowBulkDeleteConfirm(false);
            fetchUsers(currentPage, debouncedSearch);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to delete some users");
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handleResetPassword = async () => {
        if (!resetPasswordTarget) return;

        const userId = resetPasswordTarget.id;
        setIsResettingPassword(true);
        setActionLoading(userId);
        try {
            const response = await adminApi.resetUserPassword(userId);
            try {
                await navigator.clipboard.writeText(response.temporary_password);
                toast.success("Temporary password copied to clipboard");
            } catch {
                toast.success("Password reset — copy it from the admin API response");
            }
            setResetPasswordTarget(null);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to reset password");
        } finally {
            setIsResettingPassword(false);
            setActionLoading(null);
        }
    };

    // Selection handlers
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedUsers(new Set(displayedUsers.map(u => u.id)));
        } else {
            setSelectedUsers(new Set());
        }
    };

    const handleSelectUser = (userId: number, checked: boolean) => {
        setSelectedUsers(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(userId);
            } else {
                newSet.delete(userId);
            }
            return newSet;
        });
    };

    const isAllSelected = displayedUsers.length > 0 && displayedUsers.every(u => selectedUsers.has(u.id));
    const isSomeSelected = selectedUsers.size > 0;

    // Export functionality
    const exportUsers = (exportAll: boolean = false) => {
        const usersToExport = exportAll
            ? displayedUsers
            : displayedUsers.filter(u => selectedUsers.has(u.id));

        if (usersToExport.length === 0) {
            toast.error("No users selected for export");
            return;
        }

        const headers = ["ID", "Name", "Email", "Role", "Status", "Verified", "Last Login", "Created At"];
        const csvContent = [
            headers.join(","),
            ...usersToExport.map(u => [
                u.id,
                `"${u.name}"`,
                u.email,
                u.role,
                u.isActive ? "Active" : "Disabled",
                u.emailVerified ? "Yes" : "No",
                u.lastLogin ? new Date(u.lastLogin).toISOString() : "Never",
                new Date(u.createdAt).toISOString()
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);

        toast.success(`Exported ${usersToExport.length} user(s)`);
    };

    // Pagination handlers
    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setSelectedUsers(new Set());
        }
    };

    const toolbarActions = (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={toolbarInlineActionBtn} aria-label="Export">
                        <Download className="h-4 w-4 shrink-0" />
                        <ToolbarActionLabel>Export</ToolbarActionLabel>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={() => exportUsers(false)}
                        disabled={selectedUsers.size === 0}
                        className="cursor-pointer"
                    >
                        Export Selected ({selectedUsers.size})
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => exportUsers(true)}
                        className="cursor-pointer"
                    >
                        Export All ({displayedUsers.length})
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button
                        aria-label="Add User"
                        className={cn(
                            toolbarInlineActionBtn,
                            'bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white',
                        )}
                    >
                        <Plus className="h-4 w-4 shrink-0" />
                        <ToolbarActionLabel>Add User</ToolbarActionLabel>
                    </Button>
                </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Create New User</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateUser} className="space-y-4 pt-4">
                                <FloatingInput
                                    label="Full Name"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    autoComplete="off"
                                    required
                                />
                                <FloatingInput
                                    label="Email Address"
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    autoComplete="off"
                                    required
                                />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Role</label>
                                    <Select
                                        value={newUser.role}
                                        onValueChange={(val) => setNewUser({ ...newUser, role: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USER">User (Standard)</SelectItem>
                                            <SelectItem value="ADMIN">Administrator</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <FloatingInput
                                        label="Password"
                                        type="password"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        autoComplete="new-password"
                                        required
                                    />
                                    {newUser.password && <PasswordStrength password={newUser.password} />}
                                </div>
                                <div className="pt-4 border-t mt-4">
                                    <Button
                                        type="submit"
                                        className="w-full bg-purple-600 hover:bg-purple-700"
                                        disabled={isCreating}
                                    >
                                        {isCreating ? "Creating..." : "Create User"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
            </Dialog>
        </>
    );

    if (authLoading) {
        return <ListPageSkeleton columns={6} />;
    }

    if (!isAdmin()) {
        return (
            <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
                <p className="text-gray-500 mb-6">Only administrators can manage users.</p>
                <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
            </div>
        );
    }

    if (isLoading && users.length === 0) {
        return <ListPageSkeleton columns={6} />;
    }

    return (
        <ListPageShell>
            <ListPageToolbar
                searchPlaceholder="Search..."
                searchValue={searchQuery}
                onSearchChange={handleSearchChange}
                actions={toolbarActions}
                showFilterButton
                onFilter={() => setFilterModalOpen(true)}
            />

            {isSomeSelected && (
                <div className="mx-4 mb-2 flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4 animate-in fade-in duration-300 md:mx-5">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                            {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
                        </span>
                        <div className="h-4 w-px bg-border mx-1" />
                        <div className="flex gap-2">
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setShowBulkDeleteConfirm(true)}
                                className="h-8"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportUsers(false)}
                                className="h-8"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUsers(new Set())}
                        className="h-8 text-muted-foreground"
                    >
                        Clear
                    </Button>
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-auto border-t border-gray-200 dark:border-gray-800">
                <Table containerClassName="overflow-x-auto">
                    <TableHeader>
                        <TableRow className="border-b-0 bg-transparent hover:bg-transparent">
                            <TableHead className="sticky top-0 z-10 w-12 bg-gray-50 px-4 shadow-[inset_0_-1px_0_0] shadow-gray-200 dark:bg-gray-900 dark:shadow-gray-800">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={handleSelectAll}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50 px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 shadow-[inset_0_-1px_0_0] shadow-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:shadow-gray-800">
                                User
                            </TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50 px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 shadow-[inset_0_-1px_0_0] shadow-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:shadow-gray-800">
                                Role
                            </TableHead>
                            <TableHead className="sticky top-0 z-10 bg-gray-50 px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 shadow-[inset_0_-1px_0_0] shadow-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:shadow-gray-800">
                                Status
                            </TableHead>
                            <TableHead className="sticky top-0 z-10 hidden md:table-cell bg-gray-50 px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 shadow-[inset_0_-1px_0_0] shadow-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:shadow-gray-800">
                                Verified
                            </TableHead>
                            <TableHead className="sticky top-0 z-10 hidden lg:table-cell bg-gray-50 px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 shadow-[inset_0_-1px_0_0] shadow-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:shadow-gray-800">
                                Last Login
                            </TableHead>
                            <TableHead className="sticky top-0 z-10 w-16 bg-gray-50 px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 shadow-[inset_0_-1px_0_0] shadow-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:shadow-gray-800">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayedUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    {debouncedSearch.trim()
                                        ? `No users found matching "${debouncedSearch.trim()}"`
                                        : "No users found"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            displayedUsers.map((user) => (
                                <TableRow
                                    key={user.id}
                                    className="border-b border-gray-100 transition-colors hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-gray-800/40"
                                >
                                    <TableCell className="px-4">
                                        <Checkbox
                                            checked={selectedUsers.has(user.id)}
                                            onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                                            aria-label={`Select ${user.name}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-foreground">{user.name}</span>
                                            <span className="text-sm text-muted-foreground">{user.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={user.role === "ADMIN" ? "default" : "secondary"}
                                            className={user.role === "ADMIN" ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}
                                        >
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.isActive ? (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 shadow-none border-0 whitespace-nowrap">
                                                <span className="sm:hidden">Active</span>
                                                <span className="hidden sm:inline">Enabled</span>
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-200 shadow-none border-0 whitespace-nowrap">
                                                <span className="sm:hidden">Off</span>
                                                <span className="hidden sm:inline">Disabled</span>
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        {user.emailVerified ? (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 shadow-none border-0">
                                                Yes
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-200 shadow-none border-0">
                                                No
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={actionLoading === user.id}
                                                    className="text-muted-foreground hover:text-primary"
                                                >
                                                    {actionLoading === user.id ? (
                                                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                                    ) : (
                                                        <MoreVertical className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem
                                                    onClick={() => router.push(`/admin/users/${user.id}`)}
                                                    className="cursor-pointer"
                                                >
                                                    <User className="w-4 h-4 mr-2 text-blue-600" />
                                                    View Profile
                                                </DropdownMenuItem>
                                                {!user.emailVerified && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleVerifyUser(user.id)}
                                                        className="cursor-pointer"
                                                    >
                                                        <ShieldCheck className="w-4 h-4 mr-2 text-green-600" />
                                                        Verify User
                                                    </DropdownMenuItem>
                                                )}

                                                {user.isActive ? (
                                                    <DropdownMenuItem
                                                        onClick={() => handleToggleStatus(user.id, user.isActive)}
                                                        className="cursor-pointer"
                                                    >
                                                        <UserX className="w-4 h-4 mr-2 text-amber-600" />
                                                        Disable User
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem
                                                        onClick={() => handleToggleStatus(user.id, user.isActive)}
                                                        className="cursor-pointer"
                                                    >
                                                        <UserCheck className="w-4 h-4 mr-2 text-green-600" />
                                                        Enable User
                                                    </DropdownMenuItem>
                                                )}

                                                <DropdownMenuItem
                                                    onClick={() => handleRoleChange(user.id, user.role)}
                                                    className="cursor-pointer"
                                                >
                                                    <ShieldCheck className="w-4 h-4 mr-2 text-purple-600" />
                                                    {user.role === "ADMIN" ? "Demote to User" : "Promote to Admin"}
                                                </DropdownMenuItem>

                                                <DropdownMenuSeparator />

                                                <DropdownMenuItem
                                                    onClick={() => setResetPasswordTarget(user)}
                                                    className="cursor-pointer"
                                                >
                                                    <KeyRound className="w-4 h-4 mr-2 text-blue-600" />
                                                    Reset Password
                                                </DropdownMenuItem>

                                                <DropdownMenuSeparator />

                                                <DropdownMenuItem
                                                    onClick={() => setDeleteUserTarget(user)}
                                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete User
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800 md:px-5">
                        <div className="text-sm text-muted-foreground">
                            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalUsers)} of {totalUsers} users
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(page => {
                                        if (totalPages <= 5) return true;
                                        if (page === 1 || page === totalPages) return true;
                                        if (Math.abs(page - currentPage) <= 1) return true;
                                        return false;
                                    })
                                    .map((page, idx, arr) => (
                                        <span key={page} className="flex items-center">
                                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                                                <span className="px-1 text-muted-foreground">...</span>
                                            )}
                                            <Button
                                                variant={currentPage === page ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => goToPage(page)}
                                                className={currentPage === page ? "bg-primary hover:bg-primary/90" : ""}
                                            >
                                                {page}
                                            </Button>
                                        </span>
                                    ))}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={resetPasswordTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setResetPasswordTarget(null);
                }}
                title="Reset user password?"
                description={
                    <>
                        This will reset the password for{' '}
                        <span className="font-medium text-foreground">
                            {resetPasswordTarget?.name ?? 'this user'}
                        </span>
                        . A temporary password will be copied to your clipboard. Continue?
                    </>
                }
                confirmLabel="Reset Password"
                loadingLabel="Resetting..."
                isLoading={isResettingPassword}
                onConfirm={handleResetPassword}
            />

            <ConfirmDialog
                open={deleteUserTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteUserTarget(null);
                }}
                title="Delete user?"
                description={
                    <>
                        Are you sure you want to delete{' '}
                        <span className="font-medium text-foreground">
                            {deleteUserTarget?.name ?? 'this user'}
                        </span>
                        ? This action cannot be undone.
                    </>
                }
                confirmLabel="Delete"
                loadingLabel="Deleting..."
                variant="destructive"
                isLoading={isDeletingUser}
                onConfirm={handleDeleteUser}
            />

            <ConfirmDialog
                open={showBulkDeleteConfirm}
                onOpenChange={setShowBulkDeleteConfirm}
                title="Delete selected users?"
                description={`Are you sure you want to delete ${selectedUsers.size} selected user${selectedUsers.size === 1 ? '' : 's'}? This action cannot be undone.`}
                confirmLabel="Delete"
                loadingLabel="Deleting..."
                variant="destructive"
                isLoading={isBulkDeleting}
                onConfirm={handleBulkDelete}
            />

            <TableFilterModal
                open={filterModalOpen}
                onOpenChange={setFilterModalOpen}
                fields={adminUserFilterFields}
                data={users as unknown as Record<string, unknown>[]}
                appliedConditions={appliedFilters}
                onApply={(conditions) => setAppliedFilters(conditions)}
            />
        </ListPageShell>
    );
}

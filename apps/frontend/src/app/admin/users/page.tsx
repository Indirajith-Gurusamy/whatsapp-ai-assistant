"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/data/TableSkeleton";
import { Plus, MoreVertical, ShieldCheck, UserCheck, UserX, KeyRound, Trash2, Download, ChevronLeft, ChevronRight, User } from "lucide-react";
import { PasswordStrength } from "@/components/auth/PasswordStrength";

const ITEMS_PER_PAGE = 10;

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());

    // New User Form State
    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        password: "",
        role: "USER"
    });

    const fetchUsers = async (page: number = 1) => {
        setIsLoading(true);
        try {
            const skip = (page - 1) * ITEMS_PER_PAGE;
            const response = await adminApi.getAllUsers(skip, ITEMS_PER_PAGE);
            setUsers(response.users);
            setTotalUsers(response.total);
        } catch {
            toast.error("Failed to fetch users");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(currentPage);
    }, [currentPage]);

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
            fetchUsers(currentPage);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to create user");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

        setActionLoading(userId);
        try {
            await adminApi.deleteUser(userId);
            toast.success("User deleted successfully");
            setSelectedUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
            fetchUsers(currentPage);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to delete user");
        } finally {
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
        if (!confirm(`Are you sure you want to delete ${selectedUsers.size} selected users? This action cannot be undone.`)) return;

        setIsLoading(true); // Reuse isLoading or create specific bulk loading state
        try {
            const deletePromises = Array.from(selectedUsers).map(userId => adminApi.deleteUser(userId));
            await Promise.all(deletePromises);
            toast.success(`${selectedUsers.size} users deleted successfully`);
            setSelectedUsers(new Set());
            fetchUsers(currentPage);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to delete some users");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (userId: number) => {
        if (!confirm("This will reset the user's password and send a temporary password via email. Continue?")) return;

        setActionLoading(userId);
        try {
            const response = await adminApi.resetUserPassword(userId);
            toast.success(response.message);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to reset password");
        } finally {
            setActionLoading(null);
        }
    };

    // Selection handlers
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedUsers(new Set(users.map(u => u.id)));
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

    const isAllSelected = users.length > 0 && users.every(u => selectedUsers.has(u.id));
    const isSomeSelected = selectedUsers.size > 0;

    // Export functionality
    const exportUsers = (exportAll: boolean = false) => {
        const usersToExport = exportAll
            ? users
            : users.filter(u => selectedUsers.has(u.id));

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

    if (isLoading) {
        return (
            <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-40" />
                        <Skeleton className="h-4 w-56" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-32" />
                        <Skeleton className="h-9 w-28" />
                    </div>
                </div>
                <TableSkeleton columns={6} rows={10} title="" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        User Management
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage system users and their roles</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Export Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Download className="w-4 h-4" />
                                Export
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
                                Export All ({users.length})
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all">
                                <Plus className="w-4 h-4 mr-2" />
                                Add User
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
                </div>
            </div>

            {/* Selection info bar */}
            {isSomeSelected && (
                <div className="mb-4 p-4 bg-muted/50 border border-border rounded-lg flex items-center justify-between animate-in fade-in duration-300">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                            {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
                        </span>
                        <div className="h-4 w-px bg-border mx-1" />
                        <div className="flex gap-2">
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDelete}
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

            <div className="rounded-lg border border-border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={handleSelectAll}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Verified</TableHead>
                            <TableHead>Last Login</TableHead>
                            <TableHead className="text-right w-16">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No users found
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell>
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
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 shadow-none border-0">
                                                Enabled
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-200 shadow-none border-0">
                                                Disabled
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
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
                                    <TableCell className="text-muted-foreground">
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
                                                    onClick={() => handleResetPassword(user.id)}
                                                    className="cursor-pointer"
                                                >
                                                    <KeyRound className="w-4 h-4 mr-2 text-blue-600" />
                                                    Reset Password
                                                </DropdownMenuItem>

                                                <DropdownMenuSeparator />

                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteUser(user.id)}
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
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
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
        </div>
    );
}

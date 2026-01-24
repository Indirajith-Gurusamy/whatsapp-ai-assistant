"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, CheckCircle, XCircle } from "lucide-react";
import { PasswordStrength } from "@/components/auth/PasswordStrength";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // New User Form State
    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        password: "",
        role: "USER"
    });

    const fetchUsers = async () => {
        try {
            const response = await adminApi.getAllUsers(0, 100);
            setUsers(response.users);
        } catch (error) {
            toast.error("Failed to fetch users");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            // Using the updated authApi.signup which now supports role
            await authApi.signup({
                name: newUser.name,
                email: newUser.email,
                password: newUser.password,
                role: newUser.role
            });

            toast.success("User created successfully!");
            setIsDialogOpen(false);
            setNewUser({ name: "", email: "", password: "", role: "USER" });
            fetchUsers(); // Refresh list
        } catch (error: any) {
            toast.error(error.message || "Failed to create user");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

        try {
            await adminApi.deleteUser(userId);
            toast.success("User deleted successfully");
            setUsers(users.filter(u => u.id !== userId));
        } catch (error: any) {
            toast.error(error.message || "Failed to delete user");
        }
    };

    const handleRoleChange = async (userId: number, currentRole: string) => {
        const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
        try {
            await adminApi.changeUserRole(userId, newRole);
            toast.success(`User role updated to ${newRole}`);

            // Update local state
            setUsers(users.map(u =>
                u.id === userId ? { ...u, role: newRole } : u
            ));
        } catch (error: any) {
            toast.error(error.message || "Failed to update role");
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        User Management
                    </h1>
                    <p className="text-gray-500 mt-1">Manage system users and their roles</p>
                </div>

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
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name</label>
                                <Input
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email Address</label>
                                <Input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    placeholder="john@example.com"
                                    required
                                />
                            </div>
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
                                <label className="text-sm font-medium">Password</label>
                                <Input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    placeholder="••••••••"
                                    required
                                />
                                {newUser.password && <PasswordStrength password={newUser.password} />}
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-purple-600 hover:bg-purple-700"
                                disabled={isCreating}
                            >
                                {isCreating ? "Creating..." : "Create User"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50">
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Login</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                                    No users found
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-900">{user.name}</span>
                                            <span className="text-sm text-gray-500">{user.email}</span>
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
                                        <div className="flex items-center gap-2">
                                            {user.isActive ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-none border-0">
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="shadow-none">
                                                    Inactive
                                                </Badge>
                                            )}
                                            {user.emailVerified ? (
                                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-orange-500" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-500">
                                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRoleChange(user.id, user.role)}
                                                className="text-gray-500 hover:text-purple-600"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="text-gray-500 hover:text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

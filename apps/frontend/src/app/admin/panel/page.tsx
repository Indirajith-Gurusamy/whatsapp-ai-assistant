"use client";

import { useState, useEffect } from "react";
import { adminApi, UserListItem, AdminStatsResponse } from "@/lib/api";
import { AdminRoute } from "@/components/auth/AdminRoute";

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
        } catch (err: any) {
            setError(err.message || "Failed to load data");
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
        } catch (err: any) {
            alert(err.message || "Failed to change role");
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
        } catch (err: any) {
            alert(err.message || "Failed to delete user");
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

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading admin panel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
                    <p className="text-gray-600 mt-2">Manage users and system settings</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600">{error}</p>
                    </div>
                )}

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <p className="text-sm text-gray-600">Total Users</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.total_users}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <p className="text-sm text-gray-600">Admins</p>
                            <p className="text-3xl font-bold text-purple-600">{stats.total_admins}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <p className="text-sm text-gray-600">Active Users</p>
                            <p className="text-3xl font-bold text-green-600">{stats.total_active_users}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <p className="text-sm text-gray-600">Verified Users</p>
                            <p className="text-3xl font-bold text-blue-600">{stats.total_verified_users}</p>
                        </div>
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {user.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {user.emailVerified ? '✓ Yes' : '✗ No'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button
                                                onClick={() => openRoleModal(user)}
                                                className="text-purple-600 hover:text-purple-900"
                                            >
                                                Change Role
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(user)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Role Change Modal */}
            {showRoleModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4">Change User Role</h3>
                        <p className="text-gray-600 mb-4">
                            Change role for <strong>{selectedUser.name}</strong> ({selectedUser.email})
                        </p>
                        <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                        >
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                        </select>
                        <div className="flex space-x-3">
                            <button
                                onClick={handleChangeRole}
                                disabled={actionLoading}
                                className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            >
                                {actionLoading ? "Changing..." : "Confirm"}
                            </button>
                            <button
                                onClick={() => {
                                    setShowRoleModal(false);
                                    setSelectedUser(null);
                                }}
                                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4 text-red-600">Delete User</h3>
                        <p className="text-gray-600 mb-4">
                            Are you sure you want to delete <strong>{selectedUser.name}</strong> ({selectedUser.email})?
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                            This action cannot be undone. All user data, sessions, and profile will be permanently deleted.
                        </p>
                        <div className="flex space-x-3">
                            <button
                                onClick={handleDeleteUser}
                                disabled={actionLoading}
                                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {actionLoading ? "Deleting..." : "Delete User"}
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSelectedUser(null);
                                }}
                                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

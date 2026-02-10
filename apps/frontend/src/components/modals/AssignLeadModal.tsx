'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { adminApi, assignLead } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, UserPlus } from 'lucide-react';
import type { UserListItem } from '@/lib/api';

interface AssignLeadModalProps {
    conversationId: number | null;
    currentAssignee?: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function AssignLeadModal({
    conversationId,
    currentAssignee,
    open,
    onOpenChange,
    onSuccess,
}: AssignLeadModalProps) {
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>(currentAssignee || '');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);

    useEffect(() => {
        if (open) {
            fetchUsers();
            setSelectedUser(currentAssignee || '');
        }
    }, [open, currentAssignee]);

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const response = await adminApi.getAllUsers(0, 100);
            setUsers(response.users);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error('Failed to load users');
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const handleAssign = async () => {
        if (!conversationId || !selectedUser) {
            toast.error('Please select a user');
            return;
        }

        setIsAssigning(true);
        try {
            await assignLead(conversationId, selectedUser);
            toast.success('Lead assigned successfully');
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error('Failed to assign lead:', error);
            toast.error('Failed to assign lead');
        } finally {
            setIsAssigning(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Assign Lead
                    </DialogTitle>
                    <DialogDescription>
                        Select a user to assign this lead to.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="space-y-2">
                        <Label htmlFor="user">Select User</Label>
                        <Select
                            value={selectedUser}
                            onValueChange={setSelectedUser}
                            disabled={isLoadingUsers}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Select a user"} />
                            </SelectTrigger>
                            <SelectContent
                                position="popper"
                                className="max-h-60 overflow-y-auto"
                                sideOffset={4}
                            >
                                {users.map((user) => (
                                    <SelectItem key={user.id} value={user.email}>
                                        <span>{user.name} ({user.email})</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isAssigning}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleAssign}
                        disabled={isAssigning || !selectedUser}
                        className="bg-primary hover:bg-primary/90"
                    >
                        {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Assign
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

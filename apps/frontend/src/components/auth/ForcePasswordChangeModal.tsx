"use client";

import { useState } from "react";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FloatingInput } from '@/components/ui/floating-input';
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { AlertTriangle, KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ForcePasswordChangeModalProps {
    open: boolean;
}

export function ForcePasswordChangeModal({ open }: ForcePasswordChangeModalProps) {
    const { clearMustChangePassword } = useAuth();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (newPassword === currentPassword) {
            setError("New password must be different from current password");
            return;
        }

        setIsLoading(true);

        try {
            await authApi.forceChangePassword(currentPassword, newPassword);
            toast.success("Password changed successfully!");
            clearMustChangePassword();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to change password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open}>
            <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-semibold">Password Change Required</span>
                    </div>
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5" />
                        Change Your Password
                    </DialogTitle>
                    <DialogDescription>
                        Your password has been reset by an administrator. You must change your password before continuing.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                            {error}
                        </div>
                    )}

                    <FloatingInput
                        id="currentPassword"
                        label="Temporary Password *"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        disabled={isLoading}
                    />

                    <div>
                        <FloatingInput
                            id="newPassword"
                            label="New Password *"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                        {newPassword && <PasswordStrength password={newPassword} />}
                    </div>

                    <FloatingInput
                        id="confirmPassword"
                        label="Confirm New Password *"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading}
                    />

                    <div className="pt-4 border-t mt-4">
                        <Button
                            type="submit"
                            className="w-full bg-orange-600 hover:bg-orange-700"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Setting password...
                                </>
                            ) : (
                                'Change Password'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

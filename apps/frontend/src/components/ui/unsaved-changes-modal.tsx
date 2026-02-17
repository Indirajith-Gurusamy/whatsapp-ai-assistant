"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface UnsavedChangesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function UnsavedChangesModal({ isOpen, onClose, onConfirm }: UnsavedChangesModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <DialogTitle className="text-xl font-bold">Changes Not Saved</DialogTitle>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </DialogHeader>

                <div className="py-6">
                    <p className="text-gray-600">
                        You have unsaved changes. Are you sure you want to leave without saving?
                    </p>
                </div>

                <DialogFooter className="sm:justify-center gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 border border-blue-900 text-blue-900 font-semibold rounded-xl hover:bg-blue-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2.5 px-4 border border-red-500 text-red-500 font-semibold rounded-xl hover:bg-red-50 transition-colors"
                    >
                        Leave
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

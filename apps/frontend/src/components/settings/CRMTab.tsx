"use client";

import React, { useState, useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { FloatingInput } from "@/components/ui/floating-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { adminApi } from "@/lib/api";
import type { UserListItem } from "@/lib/api";

export function CRMTab({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
    const {
        settings,
        isLoading,
        isSaving,
        hasChanges,
        updateField,
        saveSettings,
    } = useSettings("crm");

    useEffect(() => {
        onDirtyChange?.(hasChanges);
    }, [hasChanges, onDirtyChange]);

    const [users, setUsers] = useState<UserListItem[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await adminApi.getAllUsers(0, 100);
                setUsers(res.users.filter((u) => u.isActive));
            } catch {
                // silently fail — dropdown will just be empty
            } finally {
                setIsLoadingUsers(false);
            }
        };
        fetchUsers();
    }, []);

    const userOptions = users.map((u) => ({
        value: u.email,
        label: `${u.name} (${u.email})`,
    }));

    if (isLoading) {
        return (
            <div className="space-y-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[52px] w-full rounded-lg" />
                ))}
            </div>
        );
    }

    const toggleBool = (key: string) => {
        updateField(key, settings[key] === "true" ? "false" : "true");
    };

    // Parse status workflow into editable list
    const statuses = (settings.status_workflow || "").split(",").filter(Boolean);

    const updateStatusWorkflow = (newStatuses: string[]) => {
        updateField("status_workflow", newStatuses.join(","));
    };

    const addStatus = () => {
        const name = prompt("Enter new status name:");
        if (name?.trim()) {
            updateStatusWorkflow([...statuses, name.trim()]);
        }
    };

    const removeStatus = (index: number) => {
        updateStatusWorkflow(statuses.filter((_, i) => i !== index));
    };

    return (
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="space-y-5">
            {/* Auto-Assign Lead Toggle */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                    <p className="text-sm font-medium text-gray-700">Auto-Assign Leads</p>
                    <p className="text-xs text-gray-400 mt-0.5">Automatically assign new leads to the default assignee</p>
                </div>
                <button
                    type="button"
                    onClick={() => toggleBool("auto_assign_lead")}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.auto_assign_lead === "true" ? "bg-orange-500" : "bg-gray-300"
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.auto_assign_lead === "true" ? "translate-x-6" : "translate-x-1"
                            }`}
                    />
                </button>
            </div>

            {/* Default Assignee */}
            <SearchableSelect
                options={userOptions}
                value={settings.default_assignee || ""}
                onChange={(value) => updateField("default_assignee", value)}
                label="Default Assignee"
                searchPlaceholder="Search employees..."
                emptyMessage={isLoadingUsers ? "Loading employees..." : "No employees found."}
                disabled={isLoadingUsers}
            />

            {/* Follow-Up Reminder */}
            <FloatingInput
                label="Follow-Up Reminder Timing (hours)"
                id="followup_reminder_nofill"
                name="followup_reminder_nofill"
                autoComplete="off"
                type="number"
                value={settings.followup_reminder_hours || "24"}
                onChange={(e) => updateField("followup_reminder_hours", e.target.value)}
            />

            {/* Status Workflow Editor */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Lead Status Workflow</label>
                <div className="border border-gray-200 rounded-lg p-4 space-y-2">
                    {statuses.map((s, idx) => (
                        <div
                            key={idx}
                            className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-gray-400 w-5">{idx + 1}.</span>
                                <span className="text-sm text-gray-700">{s}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeStatus(idx)}
                                className="text-xs text-red-500 hover:text-red-700 transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addStatus}
                        className="w-full border-2 border-dashed border-gray-300 rounded-md py-2 text-sm text-gray-500 hover:border-orange-400 hover:text-orange-600 transition-colors"
                    >
                        + Add Status
                    </button>
                </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3 pt-2">
                <button
                    onClick={saveSettings}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Settings
                </button>
                {hasChanges && (
                    <span className="text-xs font-medium text-orange-600 animate-pulse">
                        You have unsaved changes
                    </span>
                )}
            </div>
        </form>
    );
}

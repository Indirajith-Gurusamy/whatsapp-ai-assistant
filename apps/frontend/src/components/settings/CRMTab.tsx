"use client";

import React, { useState, useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { FloatingInput } from "@/components/ui/floating-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsToggleRow } from "@/components/settings/SettingsToggleRow";
import { SettingsSaveFooter } from "@/components/settings/SettingsSaveFooter";
import { settingsFormWrap } from "@/components/settings/settings-layout";
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
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
            <div className={settingsFormWrap}>
                <SettingsToggleRow
                    title="Auto-Assign Leads"
                    description="Automatically assign new leads to the default assignee"
                    checked={settings.auto_assign_lead === "true"}
                    onToggle={() => toggleBool("auto_assign_lead")}
                />

                <SearchableSelect
                    options={userOptions}
                    value={settings.default_assignee || ""}
                    onChange={(value) => updateField("default_assignee", value)}
                    label="Default Assignee"
                    searchPlaceholder="Search employees..."
                    emptyMessage={isLoadingUsers ? "Loading employees..." : "No employees found."}
                    disabled={isLoadingUsers}
                />

                <FloatingInput
                    label="Follow-Up Reminder Timing (hours)"
                    id="followup_reminder_nofill"
                    name="followup_reminder_nofill"
                    autoComplete="off"
                    type="number"
                    value={settings.followup_reminder_hours || "24"}
                    onChange={(e) => updateField("followup_reminder_hours", e.target.value)}
                />

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Lead Status Workflow
                    </label>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 space-y-2">
                        {statuses.map((s, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-md px-3 py-2 min-w-0"
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-xs font-mono text-gray-400 w-5 shrink-0">
                                        {idx + 1}.
                                    </span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                        {s}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeStatus(idx)}
                                    className="text-xs text-red-500 hover:text-red-700 transition-colors shrink-0"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addStatus}
                            className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md py-2 text-sm text-gray-500 hover:border-orange-400 hover:text-orange-600 transition-colors"
                        >
                            + Add Status
                        </button>
                    </div>
                </div>
            </div>

            <SettingsSaveFooter
                onSave={saveSettings}
                isSaving={isSaving}
                hasChanges={hasChanges}
            />
        </form>
    );
}

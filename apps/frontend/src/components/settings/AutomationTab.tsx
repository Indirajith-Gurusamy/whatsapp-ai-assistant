"use client";

import React from "react";
import { useSettings } from "@/hooks/useSettings";
import { FloatingInput } from "@/components/ui/floating-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function AutomationTab({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
    const {
        settings,
        isLoading,
        isSaving,
        hasChanges,
        updateField,
        saveSettings,
    } = useSettings("automation");

    React.useEffect(() => {
        onDirtyChange?.(hasChanges);
    }, [hasChanges, onDirtyChange]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-[52px] w-full rounded-lg" />
                ))}
            </div>
        );
    }

    const toggleBool = (key: string) => {
        updateField(key, settings[key] === "true" ? "false" : "true");
    };

    return (
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="space-y-5">
            {/* Customer Service Window Toggle */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                    <p className="text-sm font-medium text-gray-700">Customer Service Window</p>
                    <p className="text-xs text-gray-400 mt-0.5">Only respond during working hours</p>
                </div>
                <button
                    type="button"
                    onClick={() => toggleBool("customer_service_window")}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.customer_service_window === "true" ? "bg-orange-500" : "bg-gray-300"
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.customer_service_window === "true" ? "translate-x-6" : "translate-x-1"
                            }`}
                    />
                </button>
            </div>

            {/* Human Handover Toggle */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                    <p className="text-sm font-medium text-gray-700">Human Handover</p>
                    <p className="text-xs text-gray-400 mt-0.5">Allow customers to request a human agent</p>
                </div>
                <button
                    type="button"
                    onClick={() => toggleBool("human_handover")}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.human_handover === "true" ? "bg-orange-500" : "bg-gray-300"
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.human_handover === "true" ? "translate-x-6" : "translate-x-1"
                            }`}
                    />
                </button>
            </div>

            {/* Working Hours */}
            <div className="grid grid-cols-2 gap-4">
                <FloatingInput
                    label="Working Hours Start *"
                    id="working_hours_start_nofill"
                    name="working_hours_start_nofill"
                    autoComplete="off"
                    value={settings.working_hours_start || "09:00"}
                    onChange={(e) => updateField("working_hours_start", e.target.value)}
                />
                <FloatingInput
                    label="Working Hours End *"
                    id="working_hours_end_nofill"
                    name="working_hours_end_nofill"
                    autoComplete="off"
                    value={settings.working_hours_end || "18:00"}
                    onChange={(e) => updateField("working_hours_end", e.target.value)}
                />
            </div>
            <p className="text-xs text-muted-foreground -mt-3">
                Times are in 24-hour format (HH:MM) · Timezone: {timezone}
            </p>

            {/* Auto Follow-Up Delay */}
            <FloatingInput
                label="Auto Follow-Up Delay (minutes)"
                id="auto_followup_delay_nofill"
                name="auto_followup_delay_nofill"
                autoComplete="off"
                type="number"
                value={settings.auto_followup_delay_minutes || "60"}
                onChange={(e) => updateField("auto_followup_delay_minutes", e.target.value)}
            />

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

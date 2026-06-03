"use client";

import React from "react";
import { useSettings } from "@/hooks/useSettings";
import { FloatingInput } from "@/components/ui/floating-input";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsToggleRow } from "@/components/settings/SettingsToggleRow";
import { SettingsSaveFooter } from "@/components/settings/SettingsSaveFooter";
import { settingsFormWrap } from "@/components/settings/settings-layout";

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
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
            <div className={settingsFormWrap}>
                <SettingsToggleRow
                    title="Customer Service Window"
                    description="Only respond during working hours"
                    checked={settings.customer_service_window === "true"}
                    onToggle={() => toggleBool("customer_service_window")}
                />

                <SettingsToggleRow
                    title="Human Handover"
                    description="Allow customers to request a human agent"
                    checked={settings.human_handover === "true"}
                    onToggle={() => toggleBool("human_handover")}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <p className="text-xs text-muted-foreground -mt-2 sm:-mt-3">
                    Times are in 24-hour format (HH:MM) · Timezone: {timezone}
                </p>

                <FloatingInput
                    label="Auto Follow-Up Delay (minutes)"
                    id="auto_followup_delay_nofill"
                    name="auto_followup_delay_nofill"
                    autoComplete="off"
                    type="number"
                    value={settings.auto_followup_delay_minutes || "60"}
                    onChange={(e) => updateField("auto_followup_delay_minutes", e.target.value)}
                />
            </div>

            <SettingsSaveFooter
                onSave={saveSettings}
                isSaving={isSaving}
                hasChanges={hasChanges}
            />
        </form>
    );
}

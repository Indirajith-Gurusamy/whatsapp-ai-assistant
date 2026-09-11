"use client";

import React, { useEffect, useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { FloatingInput } from "@/components/ui/floating-input";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsToggleRow } from "@/components/settings/SettingsToggleRow";
import { SettingsSaveFooter } from "@/components/settings/SettingsSaveFooter";
import { settingsFormWrap } from "@/components/settings/settings-layout";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { toast } from "sonner";
import { CustomFieldsManager } from "@/components/settings/CustomFieldsManager";

export function RecruitmentTab({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
    const {
        settings,
        isLoading,
        isSaving,
        hasChanges,
        updateField,
        saveSettings,
    } = useSettings("recruitment");

    useEffect(() => {
        onDirtyChange?.(hasChanges);
    }, [hasChanges, onDirtyChange]);

    const [addStageOpen, setAddStageOpen] = useState(false);

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

    const resumeEnabled = ((): boolean => {
        try {
            const v = JSON.parse(settings.apply_form_fields || "[]");
            return Array.isArray(v) && v.map(String).includes("resume");
        } catch {
            return false;
        }
    })();

    const toggleResume = () => {
        updateField("apply_form_fields", JSON.stringify(resumeEnabled ? [] : ["resume"]));
    };

    const stages = (): string[] => {
        try {
            const v = JSON.parse(settings.default_pipeline_stages || "[]");
            return Array.isArray(v) ? v.map(String) : [];
        } catch {
            return [];
        }
    };

    const setStages = (next: string[]) => {
        updateField("default_pipeline_stages", JSON.stringify(next));
    };

    const removeStage = (index: number) => {
        setStages(stages().filter((_, i) => i !== index));
    };

    const addStage = (name: string) => {
        if (!name.trim()) return;
        setStages([...stages(), name.trim()]);
    };

    const careersUrl = settings.careers_url || "/careers";

    const handleSave = async () => {
        const ok = await saveSettings();
        if (ok) toast.success("Recruitment settings saved");
    };

    const openCareers = () => {
        window.open(careersUrl, "_blank");
    };

    return (
        <>
            <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
                <div className={settingsFormWrap}>
                    <SettingsToggleRow
                        title="Careers page"
                        description="Show the public careers website and accept applications"
                        checked={settings.careers_page_enabled === "true"}
                        onToggle={() => toggleBool("careers_page_enabled")}
                    />

                    <div className="flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            onClick={openCareers}
                            className="text-sm font-medium text-orange-600 hover:text-orange-700"
                        >
                            View careers page →
                        </button>
                    </div>

                    <FloatingInput
                        label="Company name"
                        id="company_name"
                        name="company_name"
                        autoComplete="off"
                        value={settings.company_name || ""}
                        onChange={(e) => updateField("company_name", e.target.value)}
                    />

                    <FloatingInput
                        label="Company logo URL"
                        id="company_logo_url"
                        name="company_logo_url"
                        autoComplete="off"
                        value={settings.company_logo_url || ""}
                        onChange={(e) => updateField("company_logo_url", e.target.value)}
                    />

                    <FloatingInput
                        label="Careers URL"
                        id="careers_url"
                        name="careers_url"
                        autoComplete="off"
                        value={careersUrl}
                        onChange={(e) => updateField("careers_url", e.target.value)}
                    />

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="about_message">
                            About / welcome message
                        </label>
                        <textarea
                            id="about_message"
                            value={settings.about_message || ""}
                            onChange={(e) => updateField("about_message", e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                            placeholder="Shown at the top of the careers page"
                        />
                    </div>

                    <FloatingInput
                        label="Notification email"
                        id="notification_email"
                        name="notification_email"
                        autoComplete="off"
                        type="email"
                        value={settings.notification_email || ""}
                        onChange={(e) => updateField("notification_email", e.target.value)}
                    />

                    <SettingsToggleRow
                        title="Require consent"
                        description="Require applicants to accept your privacy/processing statement"
                        checked={settings.require_consent === "true"}
                        onToggle={() => toggleBool("require_consent")}
                    />

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="consent_message">
                            Consent message
                        </label>
                        <textarea
                            id="consent_message"
                            value={settings.consent_message || ""}
                            onChange={(e) => updateField("consent_message", e.target.value)}
                            rows={2}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                        />
                    </div>

                    <FloatingInput
                        label="Privacy policy URL"
                        id="privacy_policy_url"
                        name="privacy_policy_url"
                        autoComplete="off"
                        value={settings.privacy_policy_url || ""}
                        onChange={(e) => updateField("privacy_policy_url", e.target.value)}
                    />

                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Application form
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <input
                                type="checkbox"
                                checked={resumeEnabled}
                                onChange={toggleResume}
                                className="h-4 w-4 rounded border-gray-300 accent-orange-600"
                            />
                            Resume upload
                        </label>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Other application fields are managed under Custom fields → Candidate / Application (toggle{" "}
                            <span className="font-medium">Show on careers apply form</span>).
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Messages shown after application
                        </label>
                        <div className="space-y-2">
                            <label className="block text-sm text-gray-500 dark:text-gray-400" htmlFor="apply_success_message">
                                Success message
                            </label>
                            <textarea
                                id="apply_success_message"
                                value={settings.apply_success_message || ""}
                                onChange={(e) => updateField("apply_success_message", e.target.value)}
                                rows={2}
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm text-gray-500 dark:text-gray-400" htmlFor="apply_already_applied_message">
                                Already-applied message
                            </label>
                            <textarea
                                id="apply_already_applied_message"
                                value={settings.apply_already_applied_message || ""}
                                onChange={(e) => updateField("apply_already_applied_message", e.target.value)}
                                rows={2}
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm text-gray-500 dark:text-gray-400" htmlFor="apply_resume_note">
                                Resume received note
                            </label>
                            <textarea
                                id="apply_resume_note"
                                value={settings.apply_resume_note || ""}
                                onChange={(e) => updateField("apply_resume_note", e.target.value)}
                                rows={2}
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                            />
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Blank messages fall back to the default text.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Default pipeline stages
                        </label>
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 space-y-2">
                            {stages().map((s, idx) => (
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
                                        onClick={() => removeStage(idx)}
                                        className="text-xs text-red-500 hover:text-red-700 transition-colors shrink-0"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setAddStageOpen(true)}
                                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md py-2 text-sm text-gray-500 hover:border-orange-400 hover:text-orange-600 transition-colors"
                            >
                                + Add Stage
                            </button>
                        </div>
                    </div>

                    <CustomFieldsManager />
                </div>

                <SettingsSaveFooter
                    onSave={handleSave}
                    isSaving={isSaving}
                    hasChanges={hasChanges}
                    saveLabel="Save Recruitment Settings"
                />
            </form>

            <PromptDialog
                open={addStageOpen}
                onOpenChange={setAddStageOpen}
                title="Add pipeline stage"
                description="Enter a new stage name:"
                placeholder="e.g. Technical test"
                onConfirm={addStage}
            />
        </>
    );
}
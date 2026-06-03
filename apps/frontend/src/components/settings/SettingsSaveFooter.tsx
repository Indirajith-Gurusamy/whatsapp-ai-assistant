"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { SettingsStickyFooter } from "@/components/settings/SettingsStickyFooter";
import { settingsPrimaryBtn } from "@/components/settings/settings-layout";

type SettingsSaveFooterProps = {
    onSave: () => void;
    isSaving?: boolean;
    hasChanges?: boolean;
    saveLabel?: string;
    children?: React.ReactNode;
};

export function SettingsSaveFooter({
    onSave,
    isSaving = false,
    hasChanges = false,
    saveLabel = "Save Settings",
    children,
}: SettingsSaveFooterProps) {
    return (
        <SettingsStickyFooter>
            <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className={settingsPrimaryBtn}
            >
                {isSaving && <Loader2 className="animate-spin shrink-0" />}
                <span className="sm:hidden">{saveLabel === "Save Settings" ? "Save" : saveLabel}</span>
                <span className="hidden sm:inline">{saveLabel}</span>
            </button>
            {hasChanges && (
                <span className="font-medium text-orange-600 animate-pulse py-0.5 order-last sm:order-none">
                    Unsaved changes
                </span>
            )}
            {children}
        </SettingsStickyFooter>
    );
}

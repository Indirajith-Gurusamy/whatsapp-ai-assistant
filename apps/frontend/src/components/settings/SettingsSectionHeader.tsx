"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { settingsPrimaryBtn } from "@/components/settings/settings-layout";

type SettingsSectionHeaderProps = {
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    actionIcon?: React.ReactNode;
    className?: string;
};

export function SettingsSectionHeader({
    title,
    description,
    actionLabel,
    onAction,
    actionIcon,
    className,
}: SettingsSectionHeaderProps) {
    return (
        <div
            className={cn(
                "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
                className
            )}
        >
            <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
                {description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
                )}
            </div>
            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className={cn(settingsPrimaryBtn, "whitespace-nowrap sm:max-w-none")}
                >
                    {actionIcon}
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

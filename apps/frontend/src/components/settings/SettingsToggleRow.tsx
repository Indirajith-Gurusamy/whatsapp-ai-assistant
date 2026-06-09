"use client";

import React from "react";
import { cn } from "@/lib/utils";

type SettingsToggleRowProps = {
    title: string;
    description?: string;
    checked: boolean;
    onToggle: () => void;
    disabled?: boolean;
    className?: string;
};

export function SettingsToggleRow({
    title,
    description,
    checked,
    onToggle,
    disabled = false,
    className,
}: SettingsToggleRowProps) {
    return (
        <div
            className={cn(
                "flex items-center justify-between gap-3 p-3 sm:p-4",
                "border border-gray-200 dark:border-gray-700 rounded-lg",
                disabled && "opacity-50",
                className
            )}
        >
            <div className="min-w-0 flex-1 pr-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
                {description && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
                )}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-disabled={disabled}
                disabled={disabled}
                onClick={disabled ? undefined : onToggle}
                className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                    checked ? "bg-orange-500" : "bg-gray-300 dark:bg-gray-600"
                )}
            >
                <span
                    className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                        checked ? "translate-x-6" : "translate-x-1"
                    )}
                />
            </button>
        </div>
    );
}

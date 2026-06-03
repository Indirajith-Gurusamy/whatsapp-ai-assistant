"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { settingsPadX } from "@/components/settings/settings-layout";

type SettingsStickyFooterProps = {
    children: React.ReactNode;
    className?: string;
};

/**
 * Sticky footer for settings actions.
 * Mobile: 2-column grid (Save | Test) using full width; single button spans both columns.
 */
export function SettingsStickyFooter({ children, className }: SettingsStickyFooterProps) {
    return (
        <div
            className={cn(
                "sticky bottom-0 z-40 mt-4 w-full",
                settingsPadX,
                "pt-2 pb-2 max-sm:pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:pt-3 sm:pb-3",
                "bg-white/95 dark:bg-gray-900/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/90",
                "border-t border-gray-200 dark:border-gray-800",
                "shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)]",
                className
            )}
        >
            <div
                className={cn(
                    "grid w-full grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3",
                    "[&>button]:min-w-0 [&>button]:w-full [&>button]:justify-center",
                    "[&:not(:has(>button:nth-child(2)))>button]:col-span-2",
                    "[&>span]:col-span-2 [&>span]:w-full [&>span]:text-center [&>span]:text-[10px] sm:text-xs",
                    "sm:[&>span]:col-span-1 sm:[&>span]:w-auto sm:[&>span]:text-left",
                    "sm:[&>button]:w-auto"
                )}
            >
                {children}
            </div>
        </div>
    );
}

"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsCollapsibleSectionProps = {
    title: string;
    description?: string;
    headerBelow?: React.ReactNode;
    defaultOpen?: boolean;
    /** When set, section expand state is controlled by the parent. */
    open?: boolean;
    children: React.ReactNode;
    className?: string;
};

export function SettingsCollapsibleSection({
    title,
    description,
    headerBelow,
    defaultOpen = false,
    open: controlledOpen,
    children,
    className,
}: SettingsCollapsibleSectionProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const setOpen = (value: boolean | ((prev: boolean) => boolean)) => {
        const next = typeof value === "function" ? value(open) : value;
        if (!isControlled) setUncontrolledOpen(next);
    };

    return (
        <div
            className={cn(
                "border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900",
                className
            )}
        >
            <div className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                <div className="min-w-0 flex-1">
                    <button
                        type="button"
                        onClick={() => setOpen((prev) => !prev)}
                        className="w-full text-left"
                        aria-expanded={open}
                    >
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                            {title}
                        </p>
                    </button>
                    {headerBelow && <div className="mt-1.5">{headerBelow}</div>}
                    {description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => setOpen((prev) => !prev)}
                    className="p-1 rounded-md text-gray-400 hover:text-orange-500 transition-colors shrink-0"
                    aria-label={open ? "Collapse section" : "Expand section"}
                >
                    {open ? (
                        <ChevronDown className="w-4 h-4" />
                    ) : (
                        <ChevronRight className="w-4 h-4" />
                    )}
                </button>
            </div>
            {open && (
                <div className="px-4 pt-4 pb-4 space-y-5 border-t border-gray-100 dark:border-gray-800">
                    {children}
                </div>
            )}
        </div>
    );
}

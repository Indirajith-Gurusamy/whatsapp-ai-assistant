"use client";

import React, { useEffect, useState } from "react";
import { settingsApi, AuditLogEntry } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, ChevronRight, ChevronDown, ArrowRight } from "lucide-react";

export function AuditLogPanel() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const pageSize = 15;

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                const res = await settingsApi.getAuditLogs(page * pageSize, pageSize);
                setLogs(res.logs);
                setTotal(res.total);
            } catch {
                // handled by apiFetch
            } finally {
                setIsLoading(false);
            }
        })();
    }, [page]);

    const toggleRow = (id: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const totalPages = Math.ceil(total / pageSize);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-16 text-gray-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No audit logs recorded yet</p>
            </div>
        );
    }

    const fmtDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const renderDiff = (oldVal: unknown, newVal: unknown) => {
        const oldObj = oldVal && typeof oldVal === 'object' ? (oldVal as Record<string, unknown>) : null;
        const newObj = newVal && typeof newVal === 'object' ? (newVal as Record<string, unknown>) : null;
        if (!oldObj && !newObj) return <p className="text-xs text-gray-400 italic">No data available</p>;

        const keys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
        const diffs: { key: string; from: unknown; to: unknown }[] = [];

        keys.forEach(k => {
            const v1 = oldObj?.[k];
            const v2 = newObj?.[k];
            // Simple check for primitive equality
            if (String(v1) !== String(v2)) {
                diffs.push({ key: k, from: v1, to: v2 });
            }
        });

        if (diffs.length === 0) return <p className="text-xs text-gray-400 italic">No field-level changes detected</p>;

        return (
            <div className="grid grid-cols-1 gap-2 pt-1 pb-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1">Detailed Changes</p>
                {diffs.map(d => (
                    <div key={d.key} className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs border-b border-gray-50 pb-2 last:border-0">
                        <span className="font-mono font-semibold text-gray-600 min-w-[140px] truncate">{d.key}</span>
                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                            <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded line-through opacity-70 break-all" title={String(d.from)}>
                                {d.from === null || d.from === undefined ? '-' : String(d.from)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                            <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded font-medium break-all" title={String(d.to)}>
                                {d.to === null || d.to === undefined ? '-' : String(d.to)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const categoryColors: Record<string, string> = {
        WHATSAPP: "bg-green-100 text-green-700",
        AI: "bg-purple-100 text-purple-700",
        AUTOMATION: "bg-blue-100 text-blue-700",
        CRM: "bg-orange-100 text-orange-700",
    };

    return (
        <div className="space-y-4 pb-4 sm:pb-0">
            {/* Mobile: card list */}
            <div className="md:hidden space-y-2">
                {logs.map((log) => {
                    const isExpanded = expandedRows.has(log.id);
                    return (
                        <div
                            key={log.id}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
                        >
                            <button
                                type="button"
                                onClick={() => toggleRow(log.id)}
                                className="w-full text-left p-3 space-y-2"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
                                            {log.admin_name}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">{log.admin_email}</p>
                                    </div>
                                    {isExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={`capitalize text-xs font-semibold px-2 py-0.5 rounded-full ${log.action === 'reset' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                                            }`}
                                    >
                                        {log.action}
                                    </span>
                                    <span
                                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${categoryColors[log.category] || "bg-gray-100 text-gray-600"
                                            }`}
                                    >
                                        {log.category}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-auto">{fmtDate(log.created_at)}</span>
                                </div>
                            </button>
                            {isExpanded && (
                                <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-800">
                                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-lg p-3 mt-2">
                                        {renderDiff(log.old_value, log.new_value)}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
                <table className="w-full text-sm min-w-[640px]">
                    <thead>
                        <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <th className="w-10"></th>
                            <th className="px-4 py-3">Admin</th>
                            <th className="px-4 py-3">Action</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {logs.map((log) => {
                            const isExpanded = expandedRows.has(log.id);
                            return (
                                <React.Fragment key={log.id}>
                                    <tr
                                        onClick={() => toggleRow(log.id)}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors group"
                                    >
                                        <td className="pl-4 py-3 text-center">
                                            {isExpanded ? (
                                                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-orange-500" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-orange-500" />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-gray-800">{log.admin_name}</p>
                                                <p className="text-xs text-gray-400">{log.admin_email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`capitalize text-xs font-semibold px-2 py-0.5 rounded-full ${log.action === 'reset' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                                                    }`}
                                            >
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${categoryColors[log.category] || "bg-gray-100 text-gray-600"
                                                    }`}
                                            >
                                                {log.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                            {fmtDate(log.created_at)}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-gray-50/30">
                                            <td></td>
                                            <td colSpan={4} className="px-4 pb-4">
                                                <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-inner mt-1">
                                                    {renderDiff(log.old_value, log.new_value)}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500 py-2">
                    <span className="text-center sm:text-left">
                        Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
                    </span>
                    <div className="flex gap-2 justify-center sm:justify-end">
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors bg-white shadow-sm"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page + 1 >= totalPages}
                            className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors bg-white shadow-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

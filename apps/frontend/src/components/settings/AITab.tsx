"use client";

import React, { useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { FloatingInput } from "@/components/ui/floating-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { TestResult } from "@/lib/api";

const MODEL_OPTIONS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama-3.2-90b-vision-preview",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
];

export function AITab({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
    const {
        settings,
        isLoading,
        isSaving,
        isTesting,
        hasChanges,
        updateField,
        saveSettings,
        testConnection,
    } = useSettings("ai");

    React.useEffect(() => {
        onDirtyChange?.(hasChanges);
    }, [hasChanges, onDirtyChange]);

    const [showKey, setShowKey] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);

    const handleTest = async () => {
        const res = await testConnection("ai");
        if (res) setTestResult(res as TestResult);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-[52px] w-full rounded-lg" />
                ))}
            </div>
        );
    }

    const temperature = parseFloat(settings.temperature || "0.7");
    const maxTokens = parseInt(settings.max_tokens || "300");

    return (
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="space-y-5">
            {/* Groq API Key */}
            <div className="relative">
                <FloatingInput
                    label="Groq API Key"
                    id="groq_api_key"
                    name="groq_key_nofill"
                    autoComplete="new-password"
                    type={showKey ? "text" : "password"}
                    value={settings.groq_api_key || ""}
                    onChange={(e) => updateField("groq_api_key", e.target.value)}
                    className="pr-10"
                />
                <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>

            {/* Model Selector */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Model</label>
                <select
                    value={settings.groq_model || "llama-3.3-70b-versatile"}
                    onChange={(e) => updateField("groq_model", e.target.value)}
                    className="w-full h-[52px] px-3 py-2 border border-input rounded-lg text-sm focus:border-orange-500 transition-colors bg-transparent outline-none"
                >
                    {MODEL_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                            {m}
                        </option>
                    ))}
                </select>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                    Temperature <span className="text-orange-600 font-mono">{temperature.toFixed(1)}</span>
                </label>
                <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => updateField("temperature", e.target.value)}
                    className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                    <span>Precise (0)</span>
                    <span>Creative (2)</span>
                </div>
            </div>

            {/* Max Tokens */}
            <FloatingInput
                label="Max Tokens"
                id="max_tokens"
                type="number"
                value={maxTokens.toString()}
                onChange={(e) => updateField("max_tokens", e.target.value)}
            />

            {/* System Prompt */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">System Prompt</label>
                <textarea
                    rows={4}
                    value={settings.system_prompt || ""}
                    onChange={(e) => updateField("system_prompt", e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:border-orange-500 transition-colors resize-none outline-none bg-transparent"
                    placeholder="You are a helpful assistant..."
                />
            </div>

            {/* Fallback Message */}
            <FloatingInput
                label="Fallback Message"
                id="fallback_message"
                name="fallback_msg_nofill"
                autoComplete="off"
                value={settings.fallback_message || ""}
                onChange={(e) => updateField("fallback_message", e.target.value)}
            />

            {/* Test Result */}
            {testResult && (
                <div
                    className={`px-4 py-3 rounded-lg text-sm border ${testResult.success
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-red-50 text-red-700 border-red-200"
                        }`}
                >
                    <div className="flex items-center gap-2 mb-1">
                        {testResult.success ? (
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        ) : (
                            <XCircle className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span className="font-medium">{testResult.message}</span>
                    </div>
                    {typeof testResult.details?.response === 'string' && (
                        <p className="text-xs mt-1 ml-6 opacity-80 italic">
                            &quot;{testResult.details.response}&quot;
                        </p>
                    )}
                </div>
            )}

            {/* Actions */}
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
                <button
                    onClick={handleTest}
                    disabled={isTesting}
                    className="px-5 py-2.5 border border-orange-300 text-orange-600 hover:bg-orange-50 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                    Test AI
                </button>
            </div>
        </form>
    );
}

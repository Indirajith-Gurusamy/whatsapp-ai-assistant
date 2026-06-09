"use client";

import React from "react";
import { FloatingInput } from "@/components/ui/floating-input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Brain, Eye, EyeOff, Loader2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import type { TestResult } from "@/lib/api";
import {
    AIProvider,
    AIProviderType,
    GROQ_MODELS,
    GEMINI_MODELS,
    PROVIDER_LABELS,
    defaultModelForProvider,
    normalizeProviderType,
} from "@/components/settings/ai-provider-types";

type AIProviderFieldsProps = {
    provider: AIProvider;
    showApiKey: boolean;
    onToggleShowApiKey: () => void;
    onChange: (next: AIProvider) => void;
    onSetActive: () => void;
    onDelete: () => void;
    onTest: () => void;
    isTesting: boolean;
    testResult?: TestResult;
    allowProviderTypeChange?: boolean;
    /** False until provider is saved to the server (Test uses DB config). */
    canTest?: boolean;
};

export function AIProviderFields({
    provider,
    showApiKey,
    onToggleShowApiKey,
    onChange,
    onSetActive,
    onDelete,
    onTest,
    isTesting,
    testResult,
    allowProviderTypeChange = false,
    canTest = false,
}: AIProviderFieldsProps) {
    const providerType = normalizeProviderType(provider.provider as string);
    const modelOptions = providerType === "groq" ? GROQ_MODELS : GEMINI_MODELS;

    const patch = (updates: Omit<Partial<AIProvider>, "config"> & { config?: Partial<AIProvider["config"]> }) => {
        onChange({
            ...provider,
            ...updates,
            config: { ...provider.config, ...updates.config },
        });
    };

    const handleProviderTypeChange = (type: AIProviderType) => {
        patch({
            provider: type,
            name: PROVIDER_LABELS[type],
            config: { api_key: provider.config.api_key, model: defaultModelForProvider(type) },
        });
    };

    return (
        <div className="space-y-4">
            {allowProviderTypeChange ? (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Provider
                    </label>
                    <Select
                        value={providerType}
                        onValueChange={(value) => handleProviderTypeChange(value as AIProviderType)}
                    >
                        <SelectTrigger className="h-[52px] w-full rounded-lg border-input bg-transparent">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="groq">Groq</SelectItem>
                            <SelectItem value="gemini">Gemini</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            ) : (
                <p className="text-xs text-gray-500">
                    Provider: <span className="font-medium text-gray-700 dark:text-gray-300">{PROVIDER_LABELS[providerType]}</span>
                </p>
            )}

            <div className="relative">
                <FloatingInput
                    label={providerType === "gemini" ? "Gemini API Key" : "API Key"}
                    id={`api_key_${provider.id}`}
                    name={`ai_provider_key_${provider.id}`}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    type={showApiKey ? "text" : "password"}
                    value={provider.config.api_key}
                    onChange={(e) => patch({ config: { api_key: e.target.value } })}
                    className="pr-10"
                />
                <button
                    type="button"
                    onClick={onToggleShowApiKey}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Model</label>
                <SearchableSelect
                    options={modelOptions.map((m) => ({ value: m, label: m }))}
                    value={provider.config.model}
                    onChange={(value) => value && patch({ config: { model: value } })}
                    searchPlaceholder="Search models..."
                    emptyMessage="No models found."
                />
                {providerType === "gemini" && (
                    <p className="text-xs text-gray-400 leading-relaxed">
                        Keys starting with AQ. are valid. If Test fails with 429 on a new key, Google may
                        have assigned zero free quota for this model—try{" "}
                        <span className="font-mono text-gray-500">gemini-2.0-flash-lite</span> or check{" "}
                        <a
                            href="https://ai.dev/rate-limit"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:underline"
                        >
                            ai.dev/rate-limit
                        </a>
                        .
                    </p>
                )}
            </div>

            <div className="flex items-center justify-between gap-4 py-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                    Use as active provider for replies
                </span>
                <button
                    type="button"
                    role="switch"
                    aria-checked={provider.active}
                    onClick={() => {
                        if (provider.active) {
                            patch({ active: false });
                        } else {
                            onSetActive();
                        }
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${provider.active ? "bg-orange-500" : "bg-gray-300 dark:bg-gray-600"
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${provider.active ? "translate-x-6" : "translate-x-1"
                            }`}
                    />
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
                {canTest && (
                    <button
                        type="button"
                        onClick={onTest}
                        disabled={isTesting || !provider.config.api_key.trim()}
                        className="px-3 py-1.5 border border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-xs font-medium rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {isTesting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Brain className="w-3.5 h-3.5" />
                        )}
                        Test
                    </button>
                )}
                <button
                    type="button"
                    onClick={onDelete}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                    title="Delete provider"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {canTest && testResult && (
                <div
                    className={`px-3 py-2 rounded-lg text-xs border ${testResult.success
                        ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900"
                        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900"
                        }`}
                >
                    <div className="flex items-center gap-2">
                        {testResult.success ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                            <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{testResult.message}</span>
                    </div>
                    {typeof testResult.details?.response === "string" && (
                        <p className="mt-1 ml-5 opacity-80 italic">
                            &quot;{testResult.details.response}&quot;
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

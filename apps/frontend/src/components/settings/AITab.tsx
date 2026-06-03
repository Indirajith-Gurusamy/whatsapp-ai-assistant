"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useSettings } from "@/hooks/useSettings";
import { FloatingInput } from "@/components/ui/floating-input";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsCollapsibleSection } from "@/components/settings/SettingsCollapsibleSection";
import { SettingsStickyFooter } from "@/components/settings/SettingsStickyFooter";
import { settingsActionBtn, settingsFormWrap } from "@/components/settings/settings-layout";
import { SettingsSectionHeader } from "@/components/settings/SettingsSectionHeader";
import { AIProviderFields } from "@/components/settings/AIProviderFields";
import {
    AIProvider,
    PROVIDER_LABELS,
    createNewProvider,
    isProviderDraft,
    normalizeProviderType,
    defaultModelForProvider,
} from "@/components/settings/ai-provider-types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Brain, Loader2, Plus, Sparkles } from "lucide-react";
import type { TestResult } from "@/lib/api";

export function AITab({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
    const {
        settings,
        originalSettings,
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

    const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
    const [isTestingProvider, setIsTestingProvider] = useState<Record<string, boolean>>({});
    const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
    const [draftProviderId, setDraftProviderId] = useState<string | null>(null);
    const [deleteProviderId, setDeleteProviderId] = useState<string | null>(null);

    const serializeProvider = (p: AIProvider) =>
        JSON.stringify({
            provider: p.provider,
            active: p.active,
            config: { api_key: p.config.api_key, model: p.config.model },
        });

    const originalProviders = useMemo(() => {
        try {
            const raw = JSON.parse(originalSettings.ai_providers || "[]") as AIProvider[];
            return raw.map((p) => ({
                ...p,
                provider: normalizeProviderType(p.provider as string),
            }));
        } catch {
            return [];
        }
    }, [originalSettings.ai_providers]);

    const originalProviderSnapshot = useMemo(() => {
        const map = new Map<string, string>();
        for (const p of originalProviders) {
            map.set(p.id, serializeProvider(p));
        }
        return map;
    }, [originalProviders]);

    const canTestProvider = useCallback(
        (prov: AIProvider) => {
            const snapshot = originalProviderSnapshot.get(prov.id);
            if (!snapshot) return false;
            return snapshot === serializeProvider(prov);
        },
        [originalProviderSnapshot]
    );

    const providers = useMemo(() => {
        try {
            const raw = JSON.parse(settings.ai_providers || "[]") as AIProvider[];
            return raw.map((p) => {
                const provider = normalizeProviderType(p.provider as string);
                let model = p.config?.model || "";
                if (provider === "gemini" && (model.startsWith("gpt") || !model)) {
                    model = defaultModelForProvider("gemini");
                }
                return {
                    ...p,
                    provider,
                    config: { ...p.config, model },
                };
            });
        } catch {
            return [];
        }
    }, [settings.ai_providers]);

    const persistProviders = useCallback(
        (updater: (current: AIProvider[]) => AIProvider[]) => {
            let current: AIProvider[] = [];
            try {
                current = JSON.parse(settings.ai_providers || "[]") as AIProvider[];
            } catch {
                current = [];
            }
            updateField("ai_providers", JSON.stringify(updater(current)));
        },
        [settings.ai_providers, updateField]
    );

    const handleAddProvider = () => {
        const existingDraft = providers.find((p) => isProviderDraft(p));
        if (existingDraft) {
            setDraftProviderId(existingDraft.id);
            return;
        }

        const provider = createNewProvider(providers);
        setDraftProviderId(provider.id);

        persistProviders((current) => {
            const hasActive = current.some((p) => p.active);
            if (provider.active) {
                return [
                    ...current.map((p) => ({ ...p, active: false })),
                    provider,
                ];
            }
            return [...current, provider];
        });
    };

    const handleDeleteProvider = (id: string) => {
        setDeleteProviderId(id);
    };

    const confirmDeleteProvider = () => {
        if (!deleteProviderId) return;
        if (draftProviderId === deleteProviderId) setDraftProviderId(null);
        persistProviders((current) => current.filter((p) => p.id !== deleteProviderId));
        setDeleteProviderId(null);
    };

    const handleSetActive = (id: string) => {
        setDraftProviderId(null);
        persistProviders((current) =>
            current.map((p) => ({
                ...p,
                active: p.id === id,
            }))
        );
    };

    const handleProviderChange = (updated: AIProvider) => {
        if (!isProviderDraft(updated)) {
            setDraftProviderId(null);
        }
        persistProviders((current) => {
            let next = current.map((p) => (p.id === updated.id ? updated : p));
            if (updated.active) {
                next = next.map((p) =>
                    p.id === updated.id ? { ...updated, active: true } : { ...p, active: false }
                );
            }
            return next;
        });
    };

    const handleTestProvider = async (provider: AIProvider) => {
        setIsTestingProvider((prev) => ({ ...prev, [provider.id]: true }));
        try {
            const res = await testConnection("ai", { providerId: provider.id });
            if (res) setTestResults((prev) => ({ ...prev, [provider.id]: res as TestResult }));
        } finally {
            setIsTestingProvider((prev) => ({ ...prev, [provider.id]: false }));
        }
    };

    const activeProvider = providers.find((p) => p.active);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
            </div>
        );
    }

    const temperature = parseFloat(settings.temperature || "0.7");
    const maxTokens = parseInt(settings.max_tokens || "300");

    return (
        <>
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
            <div className={settingsFormWrap}>
                <SettingsSectionHeader
                    title="AI Providers"
                    description="Connect Groq, Gemini, or additional models. One active provider handles replies."
                    actionLabel="Add Provider"
                    actionIcon={<Plus className="w-4 h-4 shrink-0" />}
                    onAction={handleAddProvider}
                />

                {providers.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No AI providers configured</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Add Groq or Gemini to enable automated replies.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {providers.map((prov) => {
                            const label = PROVIDER_LABELS[prov.provider] || prov.provider;
                            const isDraft =
                                prov.id === draftProviderId || isProviderDraft(prov);
                            const sectionTitle = isDraft
                                ? "New provider"
                                : `${label} — ${prov.config.model}`;

                            return (
                                <SettingsCollapsibleSection
                                    key={prov.id}
                                    title={sectionTitle}
                                    description={
                                        isDraft
                                            ? "Choose provider, API key, and model below"
                                            : undefined
                                    }
                                    headerBelow={
                                        prov.active ? (
                                            <span className="inline-flex px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-[10px] font-bold uppercase rounded-full">
                                                Active
                                            </span>
                                        ) : isDraft ? (
                                            <span className="text-xs text-gray-400">
                                                Not configured yet
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleSetActive(prov.id)}
                                                className="text-xs text-orange-600 hover:underline"
                                            >
                                                Set as active
                                            </button>
                                        )
                                    }
                                    defaultOpen={isDraft || prov.active}
                                >
                                    <AIProviderFields
                                        provider={prov}
                                        showApiKey={!!showApiKeys[prov.id]}
                                        onToggleShowApiKey={() =>
                                            setShowApiKeys((prev) => ({
                                                ...prev,
                                                [prov.id]: !prev[prov.id],
                                            }))
                                        }
                                        onChange={handleProviderChange}
                                        onSetActive={() => handleSetActive(prov.id)}
                                        onDelete={() => handleDeleteProvider(prov.id)}
                                        onTest={() => handleTestProvider(prov)}
                                        isTesting={!!isTestingProvider[prov.id]}
                                        testResult={testResults[prov.id]}
                                        allowProviderTypeChange={isDraft}
                                        canTest={canTestProvider(prov)}
                                    />
                                </SettingsCollapsibleSection>
                            );
                        })}
                    </div>
                )}

                <SettingsCollapsibleSection
                    title="Response behavior"
                    description="Shared settings for whichever provider is active"
                    defaultOpen
                >
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Temperature{" "}
                            <span className="text-orange-600 font-mono">{temperature.toFixed(1)}</span>
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

                    <FloatingInput
                        label="Max Tokens"
                        id="max_tokens"
                        type="number"
                        value={maxTokens.toString()}
                        onChange={(e) => updateField("max_tokens", e.target.value)}
                    />

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            System Prompt
                        </label>
                        <textarea
                            rows={4}
                            value={settings.system_prompt || ""}
                            onChange={(e) => updateField("system_prompt", e.target.value)}
                            className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:border-orange-500 resize-none outline-none bg-transparent"
                            placeholder="You are a helpful assistant..."
                        />
                    </div>

                    <FloatingInput
                        label="Fallback Message"
                        id="fallback_message"
                        name="fallback_msg_nofill"
                        autoComplete="off"
                        value={settings.fallback_message || ""}
                        onChange={(e) => updateField("fallback_message", e.target.value)}
                    />
                </SettingsCollapsibleSection>
            </div>

            <SettingsStickyFooter>
                <button
                    type="button"
                    onClick={saveSettings}
                    disabled={isSaving}
                    className={`${settingsActionBtn} bg-orange-600 hover:bg-orange-700 text-white`}
                >
                    {isSaving && <Loader2 className="animate-spin shrink-0" />}
                    <span className="sm:hidden">Save</span>
                    <span className="hidden sm:inline">Save Settings</span>
                </button>
                {activeProvider && canTestProvider(activeProvider) && (
                    <button
                        type="button"
                        onClick={() => handleTestProvider(activeProvider)}
                        disabled={isTesting}
                        className={`${settingsActionBtn} border border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 bg-white dark:bg-gray-900`}
                    >
                        {isTesting ? (
                            <Loader2 className="animate-spin shrink-0" />
                        ) : (
                            <Brain className="shrink-0" />
                        )}
                        <span className="sm:hidden">Test</span>
                        <span className="hidden sm:inline">Test Active Provider</span>
                    </button>
                )}
                {hasChanges && (
                    <span className="font-medium text-orange-600 animate-pulse py-0.5 order-last sm:order-none">
                        Unsaved changes
                    </span>
                )}
            </SettingsStickyFooter>
        </form>

        <ConfirmDialog
            open={deleteProviderId !== null}
            onOpenChange={(open) => {
                if (!open) setDeleteProviderId(null);
            }}
            title="Delete AI provider?"
            description="Delete this AI provider? This cannot be undone until you save settings."
            confirmLabel="Delete"
            variant="destructive"
            onConfirm={confirmDeleteProvider}
        />
        </>
    );
}

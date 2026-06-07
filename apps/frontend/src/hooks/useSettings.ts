"use client";

import { useState, useEffect, useCallback } from "react";
import { settingsApi } from "@/lib/api";
import { toast } from "sonner";

export function useSettings(category: string) {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [originalSettings, setOriginalSettings] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

    const fetchSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await settingsApi.getSettings(category);
            setSettings(res.settings);
            setOriginalSettings(res.settings);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to load settings");
        } finally {
            setIsLoading(false);
        }
    }, [category]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const updateField = (key: string, value: string) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const discardChanges = () => {
        setSettings(originalSettings);
    };

    const saveSettings = async () => {
        setIsSaving(true);
        try {
            let payload = settings;
            if (category.toLowerCase() === "ai") {
                payload = {
                    ai_providers: settings.ai_providers ?? "[]",
                    temperature: settings.temperature ?? "0.7",
                    max_tokens: settings.max_tokens ?? "300",
                    system_prompt: settings.system_prompt ?? "",
                    fallback_message: settings.fallback_message ?? "",
                };
            }
            const res = await settingsApi.updateSettings(category, payload);
            setSettings(res.settings);
            setOriginalSettings(res.settings);
            toast.success("Settings saved successfully");
            return true;
        } catch {
            return false;
            // apiFetch already shows toast
        } finally {
            setIsSaving(false);
        }
    };

    const resetSettings = async () => {
        setIsResetting(true);
        try {
            const res = await settingsApi.resetSettings(category);
            setSettings(res.settings);
            toast.success("Settings reset to defaults");
        } catch {
            // apiFetch already shows toast
        } finally {
            setIsResetting(false);
        }
    };

    const testConnection = async (
        type: "whatsapp" | "ai",
        options?: { accountId?: string; providerId?: string }
    ) => {
        setIsTesting(true);
        try {
            const res = type === "whatsapp"
                ? await settingsApi.testWhatsApp(options?.accountId)
                : await settingsApi.testAI(options?.providerId);
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.message);
            }
            return res;
        } catch {
            return null;
        } finally {
            setIsTesting(false);
        }
    };

    const sendTestMessage = async (accountId: string, phoneNumber: string, message: string) => {
        setIsTesting(true);
        try {
            const res = await settingsApi.sendTestWhatsApp({
                account_id: accountId,
                phone_number: phoneNumber,
                message: message,
            });
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.message);
            }
            return res;
        } catch {
            return null;
        } finally {
            setIsTesting(false);
        }
    };

    return {
        settings,
        originalSettings,
        isLoading,
        isSaving,
        isTesting,
        isResetting,
        hasChanges,
        updateField,
        saveSettings,
        resetSettings,
        discardChanges,
        testConnection,
        sendTestMessage,
        refetch: fetchSettings,
    };
}

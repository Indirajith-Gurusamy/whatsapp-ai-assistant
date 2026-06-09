"use client";

import React, { useMemo, useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { FloatingInput } from "@/components/ui/floating-input";
import { PasswordFloatingInput } from "@/components/ui/password-floating-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsToggleRow } from "@/components/settings/SettingsToggleRow";
import { SettingsSectionHeader } from "@/components/settings/SettingsSectionHeader";
import { SettingsSaveFooter } from "@/components/settings/SettingsSaveFooter";
import { settingsFormWrap } from "@/components/settings/settings-layout";
import { Button } from "@/components/ui/button";
import { Loader2, Wifi } from "lucide-react";
import { settingsApi } from "@/lib/api";
import { parseLeadStatusOptions } from "@/lib/lead-statuses";
import { toast } from "sonner";

interface EmailKeywordRule {
    id: string;
    keywords: string;
    lead_status: string;
}

interface EmailAccount {
    id: string;
    name: string;
    email: string;
    app_password: string;
    imap_host: string;
    imap_port: string;
    active: boolean;
}

const DEFAULT_ACCOUNT: EmailAccount = {
    id: "gmail-default",
    name: "Gmail Inbox",
    email: "",
    app_password: "",
    imap_host: "imap.gmail.com",
    imap_port: "993",
    active: true,
};

function parseKeywordRules(settings: Record<string, string>): EmailKeywordRule[] {
    try {
        const rules = JSON.parse(settings.email_keyword_rules || "[]") as EmailKeywordRule[];
        if (!Array.isArray(rules)) return [];
        return rules.map((rule, index) => ({
            id: rule.id || `rule-${index}`,
            keywords: rule.keywords || "",
            lead_status: rule.lead_status || "new lead",
        }));
    } catch {
        return [];
    }
}

function parseAccount(settings: Record<string, string>): EmailAccount {
    try {
        const accounts = JSON.parse(settings.email_accounts || "[]") as EmailAccount[];
        if (accounts.length > 0) {
            return { ...DEFAULT_ACCOUNT, ...accounts[0] };
        }
    } catch {
        /* use defaults */
    }
    return { ...DEFAULT_ACCOUNT };
}

export function EmailTab({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
    const {
        settings,
        isLoading,
        isSaving,
        hasChanges,
        updateField,
        saveSettings,
        refetch,
    } = useSettings("email");
    const { settings: crmSettings, isLoading: crmLoading } = useSettings("crm");

    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const account = useMemo(() => parseAccount(settings), [settings]);
    const keywordRules = useMemo(() => parseKeywordRules(settings), [settings]);
    const leadStatusOptions = useMemo(
        () =>
            parseLeadStatusOptions(crmSettings.status_workflow).map((status) => ({
                value: status,
                label: status,
            })),
        [crmSettings.status_workflow]
    );

    React.useEffect(() => {
        onDirtyChange?.(hasChanges);
    }, [hasChanges, onDirtyChange]);

    const updateAccountField = (key: keyof EmailAccount, value: string | boolean) => {
        const next: EmailAccount = { ...account, [key]: value };
        updateField("email_accounts", JSON.stringify([next]));
    };

    const saveKeywordRules = (rules: EmailKeywordRule[]) => {
        updateField("email_keyword_rules", JSON.stringify(rules));
    };

    const addKeywordRule = () => {
        saveKeywordRules([
            ...keywordRules,
            {
                id: crypto.randomUUID(),
                keywords: "",
                lead_status: "new lead",
            },
        ]);
    };

    const updateKeywordRule = (id: string, patch: Partial<EmailKeywordRule>) => {
        saveKeywordRules(
            keywordRules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule))
        );
    };

    const removeKeywordRule = (id: string) => {
        saveKeywordRules(keywordRules.filter((rule) => rule.id !== id));
    };

    const handleSave = async () => {
        const ok = await saveSettings();
        if (ok) await refetch();
        return ok;
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const res = await settingsApi.testEmail(account.id);
            setTestResult(res);
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.message);
            }
        } catch {
            toast.error("Connection test failed");
        } finally {
            setIsTesting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-[52px] w-full rounded-lg" />
                ))}
            </div>
        );
    }

    const toggleEnabled = () => {
        updateField("email_enabled", settings.email_enabled === "true" ? "false" : "true");
    };

    const toggleCreateCustomers = () => {
        updateField(
            "email_create_customers",
            settings.email_create_customers === "true" ? "false" : "true"
        );
    };

    const toggleAssignToLeads = () => {
        updateField(
            "email_assign_to_leads",
            settings.email_assign_to_leads === "true" ? "false" : "true"
        );
    };

    return (
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
            <div className={settingsFormWrap}>
                <SettingsSectionHeader
                    title="Gmail IMAP Inbox"
                    description="Poll your Gmail inbox for new messages and list them in the CRM. Use a Google App Password — OAuth is not required."
                />

                <SettingsToggleRow
                    title="Enable email ingestion"
                    description="Poll configured Gmail accounts for new inbound emails"
                    checked={settings.email_enabled === "true"}
                    onToggle={toggleEnabled}
                />

                <SettingsToggleRow
                    title="Create customers from emails"
                    description="When enabled, senders appear in Customers and Messages. Can be used on its own or together with Leads."
                    checked={settings.email_create_customers === "true"}
                    onToggle={toggleCreateCustomers}
                />

                <SettingsToggleRow
                    title="Assign emails to leads"
                    description="When enabled, senders appear in Conversations (Leads) and can be assigned. Can be used on its own or together with Customers."
                    checked={settings.email_assign_to_leads === "true"}
                    onToggle={toggleAssignToLeads}
                />

                <div className="space-y-3">
                    <SettingsSectionHeader
                        title="Keyword → lead status"
                        description="When Assign emails to leads is on, matching keywords in the subject or body set the lead status. Comma-separated keywords per rule. First matching rule wins."
                    />
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 space-y-3">
                        {keywordRules.length === 0 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                No rules yet. Emails assigned to leads default to &quot;new lead&quot; unless a rule matches.
                            </p>
                        )}
                        {keywordRules.map((rule, index) => (
                            <div
                                key={rule.id}
                                className="grid grid-cols-1 sm:grid-cols-[1fr_minmax(180px,220px)_auto] gap-3 items-end border border-gray-100 dark:border-gray-800 rounded-lg p-3"
                            >
                                <FloatingInput
                                    label={`Keywords — e.g. loan, refinance (rule ${index + 1})`}
                                    id={`email_keywords_${rule.id}`}
                                    name={`email_keywords_${rule.id}`}
                                    autoComplete="off"
                                    value={rule.keywords}
                                    onChange={(e) =>
                                        updateKeywordRule(rule.id, { keywords: e.target.value })
                                    }
                                />
                                <SearchableSelect
                                    label="Lead status"
                                    options={leadStatusOptions}
                                    value={rule.lead_status}
                                    onChange={(value) =>
                                        updateKeywordRule(rule.id, { lead_status: value })
                                    }
                                    searchPlaceholder="Search statuses..."
                                    emptyMessage={crmLoading ? "Loading statuses..." : "No statuses found."}
                                    disabled={crmLoading}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="sm:mb-1 text-red-600 hover:text-red-700"
                                    onClick={() => removeKeywordRule(rule.id)}
                                >
                                    Remove
                                </Button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addKeywordRule}
                            className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md py-2 text-sm text-gray-500 hover:border-orange-400 hover:text-orange-600 transition-colors"
                        >
                            + Add keyword rule
                        </button>
                    </div>
                </div>

                <FloatingInput
                    label="Inbox email address *"
                    id="email_address_nofill"
                    name="email_address_nofill"
                    autoComplete="off"
                    value={account.email}
                    onChange={(e) => updateAccountField("email", e.target.value)}
                />

                <PasswordFloatingInput
                    label="Gmail App Password *"
                    id="email_app_password_nofill"
                    name="email_app_password_nofill"
                    autoComplete="new-password"
                    value={account.app_password}
                    onChange={(e) => updateAccountField("app_password", e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FloatingInput
                        label="IMAP host"
                        id="imap_host_nofill"
                        name="imap_host_nofill"
                        autoComplete="off"
                        value={account.imap_host}
                        onChange={(e) => updateAccountField("imap_host", e.target.value)}
                    />
                    <FloatingInput
                        label="IMAP port"
                        id="imap_port_nofill"
                        name="imap_port_nofill"
                        autoComplete="off"
                        value={account.imap_port}
                        onChange={(e) => updateAccountField("imap_port", e.target.value)}
                    />
                </div>

                <FloatingInput
                    label="Poll interval (seconds)"
                    id="poll_interval_nofill"
                    name="poll_interval_nofill"
                    autoComplete="off"
                    value={settings.poll_interval_seconds || "60"}
                    onChange={(e) => updateField("poll_interval_seconds", e.target.value)}
                />

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleTest}
                        disabled={isTesting || !account.email}
                    >
                        {isTesting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Wifi className="mr-2 h-4 w-4" />
                        )}
                        Test IMAP connection
                    </Button>
                    {testResult && (
                        <span
                            className={
                                testResult.success
                                    ? "text-sm text-green-600"
                                    : "text-sm text-red-600"
                            }
                        >
                            {testResult.message}
                        </span>
                    )}
                </div>
            </div>

            <SettingsSaveFooter
                hasChanges={hasChanges}
                isSaving={isSaving}
                onSave={handleSave}
            />
        </form>
    );
}

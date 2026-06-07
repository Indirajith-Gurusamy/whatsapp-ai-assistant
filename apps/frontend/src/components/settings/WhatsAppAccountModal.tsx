"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FloatingInput } from "@/components/ui/floating-input";
import { Eye, EyeOff, Copy, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api-error";

export type WhatsAppPlatform = "twilio" | "meta";

export interface WhatsAppAccount {
    id: string;
    name: string;
    platform: WhatsAppPlatform;
    active: boolean;
    config: Record<string, string>;
}

interface WhatsAppAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (account: WhatsAppAccount) => void;
    account?: WhatsAppAccount;
}

const META_API_VERSION = "v23.0";

const META_WEBHOOK_FIELDS = [
    { id: "messages", label: "messages — incoming customer messages" },
    { id: "message_status", label: "message status — sent / delivered / failed updates" },
] as const;

function getWebhookUrl(): string {
    const base =
        process.env.NEXT_PUBLIC_WEBHOOK_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        API_BASE_URL;
    return `${base.replace(/\/$/, "")}/webhook`;
}

function generateVerifyToken(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function defaultMetaConfig(): Record<string, string> {
    return {
        api_version: META_API_VERSION,
        verify_token: generateVerifyToken(),
    };
}

/** Only keys the backend uses — avoid saving UI-only fields in whatsapp_accounts JSON. */
function sanitizeMetaConfig(config: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    const phoneId = config.phone_number_id?.trim();
    const token = config.access_token?.trim();
    const verify = config.verify_token?.trim();
    const waba = config.waba_id?.trim();
    const apiVersion = config.api_version?.trim() || META_API_VERSION;

    if (phoneId) out.phone_number_id = phoneId;
    if (token) out.access_token = token;
    if (verify) out.verify_token = verify;
    if (waba) out.waba_id = waba;
    out.api_version = apiVersion;
    return out;
}

function sanitizeTwilioConfig(config: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    if (config.account_sid?.trim()) out.account_sid = config.account_sid.trim();
    if (config.auth_token?.trim()) out.auth_token = config.auth_token.trim();
    if (config.whatsapp_number?.trim()) out.whatsapp_number = config.whatsapp_number.trim();
    return out;
}

function MetaSectionHeader({ title, description }: { title: string; description?: string }) {
    return (
        <div className="pt-1">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{title}</h4>
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
    );
}

export function WhatsAppAccountModal({ isOpen, onClose, onSave, account }: WhatsAppAccountModalProps) {
    const [name, setName] = useState("");
    const [platform, setPlatform] = useState<WhatsAppPlatform>("twilio");
    const [active, setActive] = useState(true);
    const [config, setConfig] = useState<Record<string, string>>({});
    const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    const webhookUrl = useMemo(() => getWebhookUrl(), []);
    const isLocalWebhook = /localhost|127\.0\.0\.1/i.test(webhookUrl);

    useEffect(() => {
        if (!isOpen) return;
        /* eslint-disable react-hooks/set-state-in-effect -- reset form when dialog opens */
        setErrors({});
        if (account) {
            setName(account.name);
            setPlatform(account.platform);
            setActive(account.active);
            setConfig({ ...account.config });
        } else {
            setName("");
            setPlatform("twilio");
            setActive(true);
            setConfig({});
        }
        /* eslint-enable react-hooks/set-state-in-effect */
    }, [account, isOpen]);

    const handlePlatformChange = (next: WhatsAppPlatform) => {
        setPlatform(next);
        setErrors({});
        if (next === "meta" && !account) {
            setConfig(defaultMetaConfig());
        } else if (next === "twilio" && !account) {
            setConfig({});
        }
    };

    const handleConfigChange = (key: string, value: string) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    };

    const toggleToken = (key: string) => {
        setShowTokens((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const copyText = async (text: string, label: string) => {
        await navigator.clipboard.writeText(text);
        toast.success(`${label} copied`);
    };

    const validate = (): boolean => {
        const next: Record<string, string> = {};
        if (!name.trim()) next.name = "Account name is required";

        if (platform === "meta") {
            const phone = config.phone_number_id?.trim();
            const waba = config.waba_id?.trim();
            if (phone && waba && phone === waba) {
                next.waba_id =
                    "Must be WhatsApp Business Account ID from Business Manager — not the same as Phone Number ID";
            }
            if (!config.phone_number_id?.trim()) {
                next.phone_number_id = "Required — from Meta App → WhatsApp → API Setup";
            }
            if (!config.access_token?.trim()) {
                next.access_token =
                    "Required — System User token with whatsapp_business_messaging permission";
            }
            if (!config.verify_token?.trim()) {
                next.verify_token = "Required — must match the token you enter in Meta webhook settings";
            }
        } else {
            if (!config.account_sid?.trim()) next.account_sid = "Account SID is required";
            if (!config.auth_token?.trim()) next.auth_token = "Auth token is required";
            if (!config.whatsapp_number?.trim()) next.whatsapp_number = "WhatsApp number is required";
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSave = () => {
        if (!validate()) {
            toast.error("Please fix the highlighted fields");
            return;
        }

        const cleanConfig =
            platform === "meta" ? sanitizeMetaConfig(config) : sanitizeTwilioConfig(config);

        onSave({
            id: account?.id || Math.random().toString(36).slice(2, 11),
            name: name.trim(),
            platform,
            active,
            config: cleanConfig,
        });
    };

    const tokenField = (
        key: "auth_token" | "access_token",
        label: string,
        id: string,
        errorKey?: string
    ) => (
        <div className="relative">
            <FloatingInput
                label={label}
                id={id}
                name={id}
                autoComplete="new-password"
                type={showTokens[key] ? "text" : "password"}
                value={config[key] || ""}
                onChange={(e) => handleConfigChange(key, e.target.value)}
                className="pr-10"
                error={errorKey ? errors[errorKey] : undefined}
            />
            <button
                type="button"
                onClick={() => toggleToken(key)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
            >
                {showTokens[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                    <DialogTitle>{account ? "Edit WhatsApp Account" : "Add WhatsApp Account"}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-2 min-h-0">
                    <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="space-y-4 pb-4">
                        <FloatingInput
                            label="Account Name*"
                            id="wa_acc_name"
                            name="wa_acc_name"
                            autoComplete="off"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (errors.name) setErrors((p) => ({ ...p, name: "" }));
                            }}
                            error={errors.name}
                        />

                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                                Platform
                            </label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => handlePlatformChange("twilio")}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                        platform === "twilio"
                                            ? "bg-orange-50 border-orange-500 text-orange-700"
                                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    Twilio
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePlatformChange("meta")}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                        platform === "meta"
                                            ? "bg-orange-50 border-orange-500 text-orange-700"
                                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    WhatsApp (Meta)
                                </button>
                            </div>
                        </div>

                        {platform === "twilio" ? (
                            <div className="space-y-4 pt-1">
                                <FloatingInput
                                    label="Account SID*"
                                    id="tw_sid"
                                    autoComplete="new-password"
                                    value={config.account_sid || ""}
                                    onChange={(e) => handleConfigChange("account_sid", e.target.value)}
                                    error={errors.account_sid}
                                />
                                {tokenField("auth_token", "Auth Token*", "tw_token", "auth_token")}
                                <FloatingInput
                                    label="WhatsApp Number*"
                                    id="tw_num"
                                    autoComplete="off"
                                    value={config.whatsapp_number || ""}
                                    onChange={(e) => handleConfigChange("whatsapp_number", e.target.value)}
                                    error={errors.whatsapp_number}
                                />
                                <p className="text-xs text-gray-500 -mt-2">
                                    Format: <code className="text-gray-700">whatsapp:+14155238886</code>
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-5 pt-1">
                                <MetaSectionHeader
                                    title="API credentials"
                                    description="From Meta Developer → your app → WhatsApp → API Setup"
                                />
                                <FloatingInput
                                    label="Phone Number ID*"
                                    id="meta_phone"
                                    autoComplete="off"
                                    value={config.phone_number_id || ""}
                                    onChange={(e) => handleConfigChange("phone_number_id", e.target.value)}
                                    error={errors.phone_number_id}
                                />
                                <p className="text-xs text-amber-800/90 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2 -mt-2">
                                    Use <strong>Phone number ID</strong> from API Setup — not the
                                    WhatsApp Business Account ID. If unsure, add <strong>WABA ID</strong> below
                                    and run <strong>Test connection</strong> to auto-fix the ID.
                                </p>
                                {tokenField("access_token", "Access Token*", "meta_token", "access_token")}
                                <FloatingInput
                                    label="WhatsApp Business Account ID (WABA)"
                                    id="meta_waba"
                                    autoComplete="off"
                                    value={config.waba_id || ""}
                                    onChange={(e) => {
                                        handleConfigChange("waba_id", e.target.value);
                                        if (errors.waba_id) {
                                            setErrors((p) => {
                                                const next = { ...p };
                                                delete next.waba_id;
                                                return next;
                                            });
                                        }
                                    }}
                                    error={errors.waba_id}
                                />
                                <p className="text-xs text-gray-500 -mt-3">
                                    Optional — WhatsApp Business Account ID from Meta Business Manager. Helps
                                    validate the phone number ID during <strong>Test connection</strong>.
                                </p>
                                <p className="text-xs text-gray-500">
                                    Graph API version:{" "}
                                    <span className="font-mono text-gray-700">{META_API_VERSION}</span>
                                </p>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                                        Webhook verify token*
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <FloatingInput
                                                label="Verify Token*"
                                                id="meta_verify"
                                                autoComplete="new-password"
                                                value={config.verify_token || ""}
                                                onChange={(e) =>
                                                    handleConfigChange("verify_token", e.target.value)
                                                }
                                                error={errors.verify_token}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleConfigChange("verify_token", generateVerifyToken())
                                            }
                                            className="shrink-0 h-[52px] px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-orange-600 transition-colors"
                                            title="Generate new token"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Use the same value in Meta → WhatsApp → Configuration → Verify token.
                                    </p>
                                </div>

                                <MetaSectionHeader
                                    title="Webhook setup"
                                    description="Paste these into Meta App Dashboard → WhatsApp → Configuration"
                                />

                                {isLocalWebhook && (
                                    <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <p>
                                            This URL uses <strong>localhost</strong>. Meta cannot reach it — expose
                                            your backend with ngrok or similar, then set{" "}
                                            <code className="font-mono">NEXT_PUBLIC_API_URL</code> to that public
                                            HTTPS URL.
                                        </p>
                                    </div>
                                )}

                                <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-3">
                                    <div>
                                        <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">
                                            Callback URL
                                        </span>
                                        <div className="mt-1 flex items-center gap-2">
                                            <code className="flex-1 text-xs text-gray-800 break-all font-mono bg-white border border-gray-100 rounded px-2 py-1.5">
                                                {webhookUrl}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => copyText(webhookUrl, "Callback URL")}
                                                className="shrink-0 p-2 rounded-md border border-gray-200 bg-white text-gray-500 hover:text-orange-600 hover:border-orange-200 transition-colors"
                                                title="Copy callback URL"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">
                                            Verify token
                                        </span>
                                        <div className="mt-1 flex items-center gap-2">
                                            <code className="flex-1 text-xs text-gray-800 break-all font-mono bg-white border border-gray-100 rounded px-2 py-1.5">
                                                {config.verify_token || "— set token above —"}
                                            </code>
                                            {config.verify_token && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        copyText(config.verify_token!, "Verify token")
                                                    }
                                                    className="shrink-0 p-2 rounded-md border border-gray-200 bg-white text-gray-500 hover:text-orange-600 hover:border-orange-200 transition-colors"
                                                    title="Copy verify token"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-dashed border-gray-200 p-3 space-y-2">
                                    <p className="text-xs font-medium text-gray-700">
                                        In Meta, subscribe to:
                                    </p>
                                    <ul className="space-y-1.5">
                                        {META_WEBHOOK_FIELDS.map((field) => (
                                            <li
                                                key={field.id}
                                                className="flex items-start gap-2 text-xs text-gray-600"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                                                <span>{field.label}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="checkbox"
                                id="acc_active"
                                checked={active}
                                onChange={(e) => setActive(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            />
                            <label htmlFor="acc_active" className="text-sm text-gray-600">
                                Active — use for outbound messages and webhook routing
                            </label>
                        </div>
                    </form>
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-gray-50/50 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                    >
                        {account ? "Update Account" : "Add Account"}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

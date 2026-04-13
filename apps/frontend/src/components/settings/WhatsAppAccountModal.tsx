"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FloatingInput } from "@/components/ui/floating-input";
import { Eye, EyeOff, Loader2, Copy } from "lucide-react";
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

export function WhatsAppAccountModal({ isOpen, onClose, onSave, account }: WhatsAppAccountModalProps) {
    const [name, setName] = useState("");
    const [platform, setPlatform] = useState<WhatsAppPlatform>("twilio");
    const [active, setActive] = useState(true);
    const [config, setConfig] = useState<Record<string, string>>({});
    const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (account) {
            setName(account.name);
            setPlatform(account.platform);
            setActive(account.active);
            setConfig(account.config);
        } else {
            setName("");
            setPlatform("twilio");
            setActive(true);
            setConfig({
                subscriptions: "messages"
            });
        }
    }, [account, isOpen]);

    const handleConfigChange = (key: string, value: string) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const toggleToken = (key: string) => {
        setShowTokens(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        onSave({
            id: account?.id || Math.random().toString(36).substr(2, 9),
            name,
            platform,
            active,
            config
        });
    };

    const isSensitive = (key: string) => {
        return ["auth_token", "access_token", "app_secret", "verify_token"].some(k => key.toLowerCase().includes(k));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{account ? "Edit Account" : "Add WhatsApp Account"}</DialogTitle>
                </DialogHeader>

                <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
                    <div className="space-y-4 py-4 overflow-y-auto flex-1">
                        <FloatingInput
                            label="Account Name"
                            id="wa_acc_name_nofill"
                            name="wa_acc_name_nofill"
                            autoComplete="off"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />

                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                                Platform
                            </label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPlatform("twilio")}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${platform === "twilio"
                                        ? "bg-orange-50 border-orange-500 text-orange-700"
                                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    Twilio
                                </button>
                                <button
                                    onClick={() => setPlatform("meta")}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${platform === "meta"
                                        ? "bg-orange-50 border-orange-500 text-orange-700"
                                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    WhatsApp (Meta)
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            {platform === "twilio" ? (
                                <>
                                    <FloatingInput
                                        label="Account SID"
                                        id="tw_sid_nofill"
                                        name="tw_sid_nofill"
                                        autoComplete="new-password"
                                        value={config.account_sid || ""}
                                        onChange={(e) => handleConfigChange("account_sid", e.target.value)}
                                    />
                                    <div className="relative">
                                        <FloatingInput
                                            label="Auth Token"
                                            id="tw_token_nofill"
                                            name="tw_token_nofill"
                                            autoComplete="new-password"
                                            type={showTokens["auth_token"] ? "text" : "password"}
                                            value={config.auth_token || ""}
                                            onChange={(e) => handleConfigChange("auth_token", e.target.value)}
                                            className="pr-10"
                                        />
                                        <button
                                            onClick={() => toggleToken("auth_token")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                        >
                                            {showTokens["auth_token"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <FloatingInput
                                        label="WhatsApp Number"
                                        id="tw_num_nofill"
                                        name="tw_num_nofill"
                                        autoComplete="off"
                                        value={config.whatsapp_number || ""}
                                        onChange={(e) => handleConfigChange("whatsapp_number", e.target.value)}
                                    />
                                </>
                            ) : (
                                <>
                                    <FloatingInput
                                        label="Phone Number ID"
                                        id="meta_phone_nofill"
                                        name="meta_phone_nofill"
                                        autoComplete="off"
                                        value={config.phone_number_id || ""}
                                        onChange={(e) => handleConfigChange("phone_number_id", e.target.value)}
                                    />
                                    <FloatingInput
                                        label="WhatsApp Business Account ID"
                                        id="meta_waba_nofill"
                                        name="meta_waba_nofill"
                                        autoComplete="off"
                                        value={config.waba_id || ""}
                                        onChange={(e) => handleConfigChange("waba_id", e.target.value)}
                                    />
                                    <div className="relative">
                                        <FloatingInput
                                            label="Access Token"
                                            id="meta_token_nofill"
                                            name="meta_token_nofill"
                                            autoComplete="new-password"
                                            type={showTokens["access_token"] ? "text" : "password"}
                                            value={config.access_token || ""}
                                            onChange={(e) => handleConfigChange("access_token", e.target.value)}
                                            className="pr-10"
                                        />
                                        <button
                                            onClick={() => toggleToken("access_token")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                        >
                                            {showTokens["access_token"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <FloatingInput
                                        label="Verify Token"
                                        id="meta_verify_nofill"
                                        name="meta_verify_nofill"
                                        autoComplete="new-password"
                                        value={config.verify_token || ""}
                                        onChange={(e) => handleConfigChange("verify_token", e.target.value)}
                                    />
                                    <div className="relative group">
                                        <FloatingInput
                                            label="Webhook Callback URL"
                                            id="meta_callback_url_nofill"
                                            name="meta_callback_url_nofill"
                                            autoComplete="off"
                                            value={config.callback_url || `${API_BASE_URL.replace(/\/$/, '')}/webhook/`}
                                            onChange={(e) => handleConfigChange("callback_url", e.target.value)}
                                            className="bg-white mt-2 pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const url = config.callback_url || `${API_BASE_URL.replace(/\/$/, '')}/webhook/`;
                                                navigator.clipboard.writeText(url);
                                                toast.success("Webhook URL copied to clipboard");
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Copy to clipboard"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1 px-1">
                                        Copy this URL to your Meta App Dashboard under WhatsApp &gt; Configuration.
                                    </p>
                                    <FloatingInput
                                        label="Webhook Subscriptions"
                                        id="meta_subscriptions_nofill"
                                        name="meta_subscriptions_nofill"
                                        autoComplete="off"
                                        value={config.subscriptions || ""}
                                        onChange={(e) => handleConfigChange("subscriptions", e.target.value)}
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1 px-1">
                                        Specify the fields you are subscribed to (e.g., messages).
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="acc_active"
                                checked={active}
                                onChange={(e) => setActive(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            />
                            <label htmlFor="acc_active" className="text-sm text-gray-600">
                                Active (Use this account for outbound/webhooks)
                            </label>
                        </div>
                    </div>
                </form>

                <DialogFooter>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
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

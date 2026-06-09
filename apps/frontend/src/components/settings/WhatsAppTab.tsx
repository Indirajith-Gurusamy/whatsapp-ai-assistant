"use client";

import React, { useState, useMemo } from "react";
import { useSettings } from "@/hooks/useSettings";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Wifi,
    Plus,
    Edit2,
    Trash2,
    CheckCircle2,
    XCircle,
    Smartphone,
    Server,
    ShieldCheck,
    Send,
    MessageSquare,
    Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { WhatsAppAccountModal, WhatsAppAccount } from "./WhatsAppAccountModal";
import { SettingsSectionHeader } from "@/components/settings/SettingsSectionHeader";
import { SettingsSaveFooter } from "@/components/settings/SettingsSaveFooter";
import { settingsFormWrap } from "@/components/settings/settings-layout";

const COUNTRY_CODE_OPTIONS = [
    { value: "+91", label: "IN +91", code: "IN" },
    { value: "+1", label: "US +1", code: "US" },
    { value: "+44", label: "GB +44", code: "GB" },
    { value: "+61", label: "AU +61", code: "AU" },
    { value: "+86", label: "CN +86", code: "CN" },
    { value: "+81", label: "JP +81", code: "JP" },
    { value: "+49", label: "DE +49", code: "DE" },
    { value: "+33", label: "FR +33", code: "FR" },
    { value: "+39", label: "IT +39", code: "IT" },
    { value: "+34", label: "ES +34", code: "ES" },
    { value: "+55", label: "BR +55", code: "BR" },
    { value: "+52", label: "MX +52", code: "MX" },
    { value: "+7", label: "RU +7", code: "RU" },
    { value: "+82", label: "KR +82", code: "KR" },
    { value: "+65", label: "SG +65", code: "SG" },
    { value: "+60", label: "MY +60", code: "MY" },
    { value: "+62", label: "ID +62", code: "ID" },
    { value: "+63", label: "PH +63", code: "PH" },
    { value: "+66", label: "TH +66", code: "TH" },
    { value: "+84", label: "VN +84", code: "VN" },
    { value: "+971", label: "AE +971", code: "AE" },
    { value: "+966", label: "SA +966", code: "SA" },
    { value: "+27", label: "ZA +27", code: "ZA" },
];

export function WhatsAppTab({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
    const {
        settings,
        isLoading,
        hasChanges,
        updateField,
        saveSettings,
        testConnection,
        sendTestMessage,
        refetch,
    } = useSettings("whatsapp");

    React.useEffect(() => {
        onDirtyChange?.(hasChanges);
    }, [hasChanges, onDirtyChange]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<WhatsAppAccount | undefined>();
    const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
    const [isTestingAcc, setIsTestingAcc] = useState<Record<string, boolean>>({});

    // Test Message state
    const [isTestMsgOpen, setIsTestMsgOpen] = useState(false);
    const [targetTestAcc, setTargetTestAcc] = useState<WhatsAppAccount | undefined>();
    const [countryCode, setCountryCode] = useState("+91");
    const [testMsgRecip, setTestMsgRecip] = useState("");
    const [testMsgContent, setTestMsgContent] = useState("Hello! This is a test message from your WhatsApp AI Assistant Dashboard. Reply to test the webhook!");
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);

    const accounts = useMemo(() => {
        try {
            return JSON.parse(settings.whatsapp_accounts || "[]") as WhatsAppAccount[];
        } catch (e) {
            console.error("Failed to parse whatsapp_accounts", e);
            return [];
        }
    }, [settings.whatsapp_accounts]);

    const handleSaveAccount = (account: WhatsAppAccount) => {
        let newAccounts: WhatsAppAccount[];
        const exists = accounts.find(a => a.id === account.id);

        if (exists) {
            newAccounts = accounts.map(a => a.id === account.id ? account : a);
        } else {
            newAccounts = [...accounts, account];
        }

        updateField("whatsapp_accounts", JSON.stringify(newAccounts));
        setIsModalOpen(false);
        setEditingAccount(undefined);
    };

    const handleDeleteAccount = (id: string) => {
        setDeleteAccountId(id);
    };

    const confirmDeleteAccount = () => {
        if (!deleteAccountId) return;
        const newAccounts = accounts.filter(a => a.id !== deleteAccountId);
        updateField("whatsapp_accounts", JSON.stringify(newAccounts));
        setDeleteAccountId(null);
    };

    const handleTestAccount = async (account: WhatsAppAccount) => {
        setIsTestingAcc(prev => ({ ...prev, [account.id]: true }));
        try {
            const res = await testConnection("whatsapp", { accountId: account.id });
            if (res) {
                setTestResults(prev => ({ ...prev, [account.id]: res }));
                if (res.success) {
                    await refetch();
                }
            }
        } finally {
            setIsTestingAcc(prev => ({ ...prev, [account.id]: false }));
        }
    };

    const handleSendTestMessage = async () => {
        if (!targetTestAcc || !testMsgRecip || !testMsgContent) return;
        setIsSendingTest(true);
        try {
            // Combine country code with phone number (remove + and any spaces)
            const fullNumber = (countryCode + testMsgRecip).replace(/[+\s]/g, '');
            const res = await sendTestMessage(targetTestAcc.id, fullNumber, testMsgContent);
            if (res?.success) {
                setIsTestMsgOpen(false);
                setTestMsgRecip("");
            }
        } finally {
            setIsSendingTest(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className={settingsFormWrap}>
            <SettingsSectionHeader
                title="WhatsApp Accounts"
                description="Manage multiple WhatsApp platforms and accounts."
                actionLabel="Add Account"
                actionIcon={<Plus className="w-4 h-4 shrink-0" />}
                onAction={() => {
                    setEditingAccount(undefined);
                    setIsModalOpen(true);
                }}
            />

            {accounts.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No WhatsApp accounts configured</p>
                    <p className="text-xs text-gray-400 mt-1">Click the button above to add your first account.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {accounts.map((acc) => (
                        <div
                            key={acc.id}
                            className={`p-4 sm:p-5 rounded-xl border transition-all ${acc.active
                                ? "bg-white border-orange-100 shadow-sm"
                                : "bg-gray-50 border-gray-200 opacity-75"
                                }`}
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                                    <div className={`p-2.5 sm:p-3 rounded-lg shrink-0 ${acc.platform === 'twilio' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                        }`}>
                                        {acc.platform === 'twilio' ? <Server className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="font-bold text-gray-800 truncate max-w-full">{acc.name}</h4>
                                            {acc.active && (
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                            <span className="capitalize">{acc.platform}</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full hidden sm:inline" />
                                            <span className="break-all sm:break-normal">
                                                {acc.config.whatsapp_number ||
                                                    acc.config.phone_number_id ||
                                                    "No ID"}
                                            </span>
                                            {acc.platform === "meta" && acc.config.waba_id && (
                                                <>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full hidden sm:inline" />
                                                    <span className="break-all sm:break-normal text-gray-400">
                                                        WABA {acc.config.waba_id}
                                                    </span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0">
                                    <button
                                        onClick={() => handleTestAccount(acc)}
                                        disabled={isTestingAcc[acc.id]}
                                        className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                        title="Test Connection"
                                    >
                                        <Wifi className={`w-4 h-4 ${isTestingAcc[acc.id] ? 'animate-pulse text-orange-500' : ''}`} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTargetTestAcc(acc);
                                            setIsTestMsgOpen(true);
                                        }}
                                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                        title="Send Test Message"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingAccount(acc);
                                            setIsModalOpen(true);
                                        }}
                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit Account"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteAccount(acc.id)}
                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Account"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap gap-x-6 gap-y-2">
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                    <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="font-medium text-gray-400 uppercase tracking-tighter">Encrypted</span>
                                </div>
                                {acc.platform === 'twilio' && (
                                    <div className="text-[11px] text-gray-500">
                                        SID: <span className="font-mono text-gray-400">{String(acc.config.account_sid).slice(0, 8)}...</span>
                                    </div>
                                )}
                            </div>

                            {testResults[acc.id] && (
                                <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${testResults[acc.id].success
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-700"
                                    }`}>
                                    {testResults[acc.id].success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                    {testResults[acc.id].message}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <SettingsSaveFooter
                onSave={saveSettings}
                hasChanges={hasChanges}
                saveLabel="Save"
            />

            <WhatsAppAccountModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveAccount}
                account={editingAccount}
            />

            <Dialog open={isTestMsgOpen} onOpenChange={setIsTestMsgOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Send className="w-5 h-5 text-orange-600" />
                            Send Test Message
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                            <p className="text-xs text-blue-700 leading-relaxed">
                                Use this to verify that <strong>{targetTestAcc?.name}</strong> can send messages.
                                Enter your personal WhatsApp number (with country code) to receive a test message.
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                                Phone Number
                            </label>
                            <div className="flex gap-2">
                                <SearchableSelect
                                    options={COUNTRY_CODE_OPTIONS}
                                    value={countryCode}
                                    onChange={(value) => value && setCountryCode(value)}
                                    showFlags
                                    searchPlaceholder="Search country..."
                                    emptyMessage="No countries found."
                                    className="w-[150px] shrink-0"
                                />
                                <input
                                    type="text"
                                    id="test_recip_nofill"
                                    value={testMsgRecip}
                                    onChange={(e) => setTestMsgRecip(e.target.value)}
                                    placeholder="6382920850"
                                    className="flex-1 h-[52px] px-3 text-sm border border-input rounded-lg outline-none focus:border-orange-500 bg-transparent"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                                Message Content
                            </label>
                            <textarea
                                className="w-full min-h-[100px] p-3 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                value={testMsgContent}
                                onChange={(e) => setTestMsgContent(e.target.value)}
                                placeholder="Enter your test message here..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <button
                            onClick={() => setIsTestMsgOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSendTestMessage}
                            disabled={isSendingTest || !testMsgRecip}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSendingTest ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send Message
                                </>
                            )}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteAccountId !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteAccountId(null);
                }}
                title="Delete WhatsApp account?"
                description="Are you sure you want to delete this account? You will need to save settings to apply this change."
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={confirmDeleteAccount}
            />
        </div>
    );
}

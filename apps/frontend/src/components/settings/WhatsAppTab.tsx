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
    AlertCircle,
    Send,
    MessageSquare,
    Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FloatingInput } from "@/components/ui/floating-input";
import { WhatsAppAccountModal, WhatsAppAccount } from "./WhatsAppAccountModal";

export function WhatsAppTab({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
    const {
        settings,
        isLoading,
        hasChanges,
        updateField,
        saveSettings,
        testConnection,
        sendTestMessage,
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
    const [isTemplate, setIsTemplate] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);

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
        if (!confirm("Are you sure you want to delete this account?")) return;
        const newAccounts = accounts.filter(a => a.id !== id);
        updateField("whatsapp_accounts", JSON.stringify(newAccounts));
    };

    const handleTestAccount = async (account: WhatsAppAccount) => {
        setIsTestingAcc(prev => ({ ...prev, [account.id]: true }));
        try {
            const res = await testConnection("whatsapp", { accountId: account.id });
            if (res) {
                setTestResults(prev => ({ ...prev, [account.id]: res }));
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
            const res = await sendTestMessage(targetTestAcc.id, fullNumber, testMsgContent, isTemplate);
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">WhatsApp Accounts</h3>
                    <p className="text-sm text-gray-500">Manage multiple WhatsApp platforms and accounts.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingAccount(undefined);
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    Add Account
                </button>
            </div>

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
                            className={`p-5 rounded-xl border transition-all ${acc.active
                                ? "bg-white border-orange-100 shadow-sm"
                                : "bg-gray-50 border-gray-200 opacity-75"
                                }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-lg ${acc.platform === 'twilio' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                        }`}>
                                        {acc.platform === 'twilio' ? <Server className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-gray-800">{acc.name}</h4>
                                            {acc.active && (
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                                            <span className="capitalize">{acc.platform}</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                            <span>{acc.config.whatsapp_number || acc.config.phone_number_id || "No ID"}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
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

            <div className="flex items-center justify-end gap-3 pt-4">
                {hasChanges && (
                    <span className="text-sm font-medium text-orange-600 animate-pulse">
                        You have unsaved changes
                    </span>
                )}
                <button
                    onClick={saveSettings}
                    className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg transition-all shadow-md active:scale-95"
                >
                    Save
                </button>
            </div>

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
                            <div className="flex border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500 transition-all">
                                <select
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="px-3 py-3 text-sm border-r bg-gray-50 outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    <option value="+91">IN +91</option>
                                    <option value="+1">US +1</option>
                                    <option value="+44">GB +44</option>
                                    <option value="+61">AU +61</option>
                                    <option value="+86">CN +86</option>
                                    <option value="+81">JP +81</option>
                                    <option value="+49">DE +49</option>
                                    <option value="+33">FR +33</option>
                                    <option value="+39">IT +39</option>
                                    <option value="+34">ES +34</option>
                                    <option value="+55">BR +55</option>
                                    <option value="+52">MX +52</option>
                                    <option value="+7">RU +7</option>
                                    <option value="+82">KR +82</option>
                                    <option value="+65">SG +65</option>
                                    <option value="+60">MY +60</option>
                                    <option value="+62">ID +62</option>
                                    <option value="+63">PH +63</option>
                                    <option value="+66">TH +66</option>
                                    <option value="+84">VN +84</option>
                                    <option value="+971">AE +971</option>
                                    <option value="+966">SA +966</option>
                                    <option value="+27">ZA +27</option>
                                </select>
                                <input
                                    type="text"
                                    id="test_recip_nofill"
                                    value={testMsgRecip}
                                    onChange={(e) => setTestMsgRecip(e.target.value)}
                                    placeholder="6382920850"
                                    className="flex-1 px-3 py-3 text-sm outline-none"
                                />
                            </div>
                        </div>

                        {targetTestAcc?.platform === "meta" && (
                            <div className="flex items-center gap-2 px-1">
                                <input
                                    type="checkbox"
                                    id="is_template"
                                    checked={isTemplate}
                                    onChange={(e) => setIsTemplate(e.target.checked)}
                                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                />
                                <label htmlFor="is_template" className="text-sm font-medium text-gray-700 cursor-pointer">
                                    Send as Template (Recommended for Meta Test Numbers)
                                </label>
                            </div>
                        )}

                        {!isTemplate && (
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
                        )}

                        {isTemplate && (
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <p className="text-[11px] text-gray-500 font-mono">
                                    <strong>Template:</strong> jaspers_market_order_confirmation_v1<br />
                                    <strong>Language:</strong> en_US<br />
                                    <strong>Parameters:</strong> [{testMsgContent || 'Test User'}, 123456, Feb 17, 2026]
                                </p>
                            </div>
                        )}
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
        </div>
    );
}

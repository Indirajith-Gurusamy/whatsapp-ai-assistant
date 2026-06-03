"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Brain, Zap, Users, ClipboardList, ShieldAlert } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WhatsAppTab } from "@/components/settings/WhatsAppTab";
import { AITab } from "@/components/settings/AITab";
import { AutomationTab } from "@/components/settings/AutomationTab";
import { CRMTab } from "@/components/settings/CRMTab";
import { AuditLogPanel } from "@/components/settings/AuditLogPanel";
import { Skeleton } from "@/components/ui/skeleton";

import { UnsavedChangesModal } from "@/components/ui/unsaved-changes-modal";
import { settingsContentPad, settingsPadX } from "@/components/settings/settings-layout";

export default function SettingsPage() {
    const { isAdmin, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("whatsapp");
    const [pendingTab, setPendingTab] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

    const pageWrap = "w-full min-w-0";
    const cardWrap =
        "w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800";
    const stickyTabsClass =
        `sticky top-0 z-30 w-full ${settingsPadX} py-3 rounded-t-xl ` +
        "bg-white/95 dark:bg-gray-900/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/90 " +
        "border-b border-gray-200/80 dark:border-gray-800";

    // Admin guard
    if (authLoading) {
        return (
            <div className={pageWrap}>
                <div className={`${cardWrap} ${settingsContentPad} space-y-4`}>
                    <Skeleton className="h-10 w-full" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    if (!isAdmin()) {
        return (
            <div className={pageWrap}>
                <div className={`${cardWrap} text-center py-16`}>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                        <ShieldAlert className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
                    <p className="text-gray-500 mb-6">Only administrators can access system settings.</p>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const handleTabChange = (value: string) => {
        if (isDirty) {
            setPendingTab(value);
            setShowUnsavedConfirm(true);
        } else {
            setActiveTab(value);
        }
    };

    const confirmTabChange = () => {
        if (pendingTab) {
            setActiveTab(pendingTab);
            setIsDirty(false);
            setPendingTab(null);
        }
        setShowUnsavedConfirm(false);
    };

    const tabItems = [
        { value: "whatsapp", label: "WhatsApp", shortLabel: "WA", icon: MessageSquare },
        { value: "ai", label: "AI", shortLabel: "AI", icon: Brain },
        { value: "automation", label: "Automation", shortLabel: "Auto", icon: Zap },
        { value: "crm", label: "CRM", shortLabel: "CRM", icon: Users },
        { value: "audit", label: "Audit Log", shortLabel: "Log", icon: ClipboardList },
    ];

    return (
        <div className={pageWrap}>
            <div className={cardWrap}>
                <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-0">
                    <div className={stickyTabsClass}>
                        <TabsList className="flex w-full h-11 sm:h-10 rounded-lg bg-muted p-1 gap-0.5 sm:gap-1 shadow-none">
                            {tabItems.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        className="flex-1 min-w-0 h-full flex-col gap-0.5 sm:flex-row sm:gap-1.5 rounded-md border-0 px-1 py-1.5 sm:px-2 text-xs sm:text-sm font-medium
                                            text-gray-600 dark:text-gray-400
                                            data-[state=active]:bg-white data-[state=active]:text-gray-900
                                            dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900
                                            data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent"
                                    >
                                        <Icon className="w-4 h-4 shrink-0" />
                                        <span className="sm:hidden leading-none">{tab.shortLabel}</span>
                                        <span className="hidden sm:inline truncate">{tab.label}</span>
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </div>

                    <div className={settingsContentPad}>
                        <TabsContent value="whatsapp" className="mt-0">
                            <WhatsAppTab onDirtyChange={setIsDirty} />
                        </TabsContent>
                        <TabsContent value="ai" className="mt-0">
                            <AITab onDirtyChange={setIsDirty} />
                        </TabsContent>
                        <TabsContent value="automation" className="mt-0">
                            <AutomationTab onDirtyChange={setIsDirty} />
                        </TabsContent>
                        <TabsContent value="crm" className="mt-0">
                            <CRMTab onDirtyChange={setIsDirty} />
                        </TabsContent>
                        <TabsContent value="audit" className="mt-0">
                            <AuditLogPanel />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            <UnsavedChangesModal
                isOpen={showUnsavedConfirm}
                onClose={() => setShowUnsavedConfirm(false)}
                onConfirm={confirmTabChange}
            />
        </div>
    );
}

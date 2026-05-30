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

export default function SettingsPage() {
    const { isAdmin, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("whatsapp");
    const [pendingTab, setPendingTab] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

    // Admin guard
    if (authLoading) {
        return (
            <div className="p-4 md:p-6 lg:p-8 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 space-y-4">
                    <Skeleton className="h-10 w-full max-w-xl" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    if (!isAdmin()) {
        return (
            <div className="p-4 md:p-6 lg:p-8">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 text-center py-20">
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
        { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
        { value: "ai", label: "AI", icon: Brain },
        { value: "automation", label: "Automation", icon: Zap },
        { value: "crm", label: "CRM", icon: Users },
        { value: "audit", label: "Audit Log", icon: ClipboardList },
    ];

    return (
        <div className="p-4 md:p-6 lg:p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>


            </div>

            {/* Main Content */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList className="mb-6 w-full sm:w-auto">
                        {tabItems.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    <TabsContent value="whatsapp">
                        <WhatsAppTab onDirtyChange={setIsDirty} />
                    </TabsContent>
                    <TabsContent value="ai">
                        <AITab onDirtyChange={setIsDirty} />
                    </TabsContent>
                    <TabsContent value="automation">
                        <AutomationTab onDirtyChange={setIsDirty} />
                    </TabsContent>
                    <TabsContent value="crm">
                        <CRMTab onDirtyChange={setIsDirty} />
                    </TabsContent>
                    <TabsContent value="audit">
                        <AuditLogPanel />
                    </TabsContent>
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

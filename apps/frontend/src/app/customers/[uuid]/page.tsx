'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { fetchCustomerByUuid, fetchCustomerHistoryByUuid, toggleConversationAI, sendAgentMessage } from '@/lib/api';
import { WhatsAppChat } from '@/components/chat/WhatsAppChat';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { getPageBreadcrumb } from '@/lib/page-titles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Tag, MessageCircle, Info } from 'lucide-react';
import type { Customer, ConversationHistory, MessageDeliveryStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const categoryKeywords: Record<string, string[]> = {
    'Loan': ['loan', 'credit', 'borrow', 'finance'],
    'Insurance': ['insurance', 'policy', 'coverage'],
    'Investment': ['invest', 'portfolio', 'returns'],
    'Savings': ['savings', 'deposit', 'save'],
    'Business': ['business', 'startup', 'venture'],
    'Education': ['education', 'fees', 'school'],
    'Property': ['property', 'real estate', 'house'],
    'Consultation': ['help', 'advice', 'consult'],
};

function categorizeMessage(message: string | null): string {
    if (!message) return 'General';
    const msg = message.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => msg.includes(keyword))) return category;
    }
    return 'General';
}

function formatEnquiryDate(dateString: string | null | undefined): string {
    if (!dateString) return '-';
    try {
        const d = new Date(dateString);
        if (Number.isNaN(d.getTime())) return dateString;
        return d.toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    } catch {
        return dateString;
    }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function CustomerDetailContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const breadcrumb = getPageBreadcrumb(pathname, searchParams.get('from'));
    const initialTab = searchParams.get('tab') === 'details' ? 'details' : 'chat';
    const [activeTab, setActiveTab] = useState(initialTab);

    const customerUuid = params.uuid as string;
    const isValidUuid = UUID_REGEX.test(customerUuid);

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [history, setHistory] = useState<ConversationHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [aiEnabled, setAiEnabled] = useState(true);
    const [isTogglingAI, setIsTogglingAI] = useState(false);
    const [agentMessage, setAgentMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [conversationUuid, setConversationUuid] = useState<string | null>(null);
    const [pendingMessages, setPendingMessages] = useState<ConversationHistory[]>([]);

    useEffect(() => {
        setActiveTab(searchParams.get('tab') === 'details' ? 'details' : 'chat');
    }, [searchParams]);

    useEffect(() => {
        if (!isValidUuid) {
            router.replace('/customers');
            return;
        }

        async function loadData() {
            try {
                const [customerData, historyData] = await Promise.all([
                    fetchCustomerByUuid(customerUuid),
                    fetchCustomerHistoryByUuid(customerUuid),
                ]);
                setCustomer(customerData);
                setHistory(Array.isArray(historyData) ? historyData : []);
                setAiEnabled(customerData.ai_enabled ?? true);
                setConversationUuid(customerData.conversation_uuid ?? null);
            } catch (error) {
                console.error('Failed to load customer data:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [customerUuid, isValidUuid, router]);

    // Poll for delivery/read ticks and new AI replies
    useEffect(() => {
        if (!isValidUuid || isLoading) return;

        const refreshHistory = async () => {
            try {
                const historyData = await fetchCustomerHistoryByUuid(customerUuid);
                const next = Array.isArray(historyData) ? historyData : [];
                setHistory(next);
                setPendingMessages((prev) =>
                    prev.filter(
                        (p) =>
                            !next.some(
                                (m) =>
                                    m.content === p.content &&
                                    m.role === p.role &&
                                    Math.abs(
                                        new Date(m.timestamp).getTime() -
                                            new Date(p.timestamp).getTime()
                                    ) < 60000
                            )
                    )
                );
            } catch {
                /* ignore poll errors */
            }
        };

        const interval = setInterval(refreshHistory, 3000);
        return () => clearInterval(interval);
    }, [customerUuid, isValidUuid, isLoading]);

    const customerEnquiries = useMemo(
        () => history.filter((m) => m.role === 'customer'),
        [history]
    );

    const latestEnquiry = useMemo(() => {
        const last = customerEnquiries[customerEnquiries.length - 1];
        if (last?.content) return last.content;
        return customer?.message || null;
    }, [customerEnquiries, customer?.message]);

    const firstEnquiryTime = useMemo(() => {
        const first = customerEnquiries[0];
        if (first?.timestamp) return first.timestamp;
        return customer?.message_time;
    }, [customerEnquiries, customer?.message_time]);

    const handleToggleAI = async () => {
        if (!conversationUuid) return;
        setIsTogglingAI(true);
        try {
            const newEnabled = !aiEnabled;
            await toggleConversationAI(conversationUuid, newEnabled);
            setAiEnabled(newEnabled);
            toast.success(newEnabled ? 'AI Assistant enabled' : 'AI disabled — you are now in control');
        } catch {
            toast.error('Failed to toggle AI');
        } finally {
            setIsTogglingAI(false);
        }
    };

    const handleSendMessage = async () => {
        if (!conversationUuid) return;
        const text = agentMessage.trim();
        if (!text) return;

        const optimistic: ConversationHistory = {
            id: undefined,
            role: 'human_agent',
            name: 'Human Agent',
            content: text,
            timestamp: new Date().toISOString(),
            status: 'sending' as MessageDeliveryStatus,
        };

        setAgentMessage('');
        setPendingMessages((prev) => [...prev, optimistic]);
        setIsSending(true);

        try {
            await sendAgentMessage(conversationUuid, text);

            setPendingMessages((prev) =>
                prev.map((m) =>
                    m.timestamp === optimistic.timestamp
                        ? { ...m, status: 'sent' as MessageDeliveryStatus }
                        : m
                )
            );

            const historyData = await fetchCustomerHistoryByUuid(customerUuid);
            setHistory(Array.isArray(historyData) ? historyData : []);
            setPendingMessages([]);
        } catch {
            setPendingMessages((prev) =>
                prev.map((m) =>
                    m.timestamp === optimistic.timestamp
                        ? { ...m, status: 'failed' as MessageDeliveryStatus }
                        : m
                )
            );
            toast.error('Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!isValidUuid) return null;

    if (!customer && !isLoading) {
        return (
            <div className="p-6">
                {breadcrumb && (
                    <PageBreadcrumb
                        href={breadcrumb.href}
                        label={breadcrumb.label}
                        className="mb-6"
                    />
                )}
                <div className="text-center text-muted-foreground">
                    Customer not found
                </div>
            </div>
        );
    }

    const category = categorizeMessage(latestEnquiry);

    return (
        <div className="flex flex-col flex-1 min-h-0 h-full w-full max-w-none overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 h-full w-full max-w-none gap-0 [&>[data-slot=tabs-content]]:flex-1">
                {/* Top bar: back + tab switcher */}
                <div className="flex-none flex w-full shrink-0 items-center gap-3 border-b border-[#d1d7db] bg-white px-3 py-2">
                    <TabsList className="h-9 max-w-xs flex-1 bg-[#f0f2f5] p-0.5">
                        <TabsTrigger
                            value="chat"
                            className="flex-1 gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-[#008069] data-[state=active]:shadow-sm"
                        >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Chat
                        </TabsTrigger>
                        <TabsTrigger
                            value="details"
                            className="flex-1 gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-[#008069] data-[state=active]:shadow-sm"
                        >
                            <Info className="w-3.5 h-3.5" />
                            Info
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent
                    value="chat"
                    className="flex-1 flex flex-col min-h-0 h-0 m-0 p-0 w-full max-w-none outline-none data-[state=inactive]:hidden overflow-hidden bg-[#efeae2]"
                >
                    <WhatsAppChat
                        customerName={customer?.name || 'User'}
                        customerPhone={customer?.phone || ''}
                        history={history}
                        isLoading={isLoading}
                        aiEnabled={aiEnabled}
                        isTogglingAI={isTogglingAI}
                        conversationUuid={conversationUuid}
                        onToggleAI={handleToggleAI}
                        agentMessage={agentMessage}
                        onAgentMessageChange={setAgentMessage}
                        onSendMessage={handleSendMessage}
                        isSending={isSending}
                        pendingMessages={pendingMessages}
                        onKeyDown={handleKeyDown}
                        onBack={() => router.back()}
                    />
                </TabsContent>

                <TabsContent
                    value="details"
                    className="flex-1 min-h-0 h-0 m-0 w-full max-w-none overflow-y-auto overscroll-contain p-3 md:p-4 space-y-4 outline-none data-[state=inactive]:hidden bg-background"
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="border-[#e9edef] shadow-sm">
                            <CardHeader className="py-3 pb-2">
                                <CardTitle className="text-sm flex items-center gap-2 text-[#008069]">
                                    <User className="w-4 h-4" />
                                    Customer
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 pb-4 text-sm">
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-[#667781] font-medium">Name</p>
                                    <p className="font-semibold text-[#111b21]">{customer?.name || 'User'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-[#667781] font-medium">Phone</p>
                                    <p className="font-semibold text-[#008069]">+{customer?.phone}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-[#667781] font-medium">First enquiry</p>
                                    <p className="font-medium text-[#111b21]">
                                        {formatEnquiryDate(firstEnquiryTime)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-[#e9edef] shadow-sm">
                            <CardHeader className="py-3 pb-2">
                                <CardTitle className="text-sm flex items-center gap-2 text-[#008069]">
                                    <Tag className="w-4 h-4" />
                                    Category
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <Badge className="bg-[#d9fdd3] text-[#008069] hover:bg-[#d9fdd3] border-none">
                                    {category}
                                </Badge>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-[#e9edef] shadow-sm">
                        <CardHeader className="py-3 pb-2">
                            <CardTitle className="text-sm text-[#111b21]">Latest enquiry</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <div className="bg-[#efeae2] p-4 rounded-lg border border-[#e9edef]">
                                <p className="text-sm leading-relaxed text-[#111b21] whitespace-pre-wrap">
                                    {latestEnquiry || '—'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function CustomerDetailPage() {
    return <CustomerDetailContent />;
}

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { fetchCustomerHistory } from '@/lib/api';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Phone, Calendar, Tag } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import type { ConversationHistory } from '@/types';
import { Badge } from '@/components/ui/badge';
import { themeClasses } from '@/lib/theme';
import { Skeleton } from '@/components/ui/skeleton';

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

function CustomerDetailContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { customers } = useCustomers();

    const customerId = Number(params.id);
    const phone = searchParams.get('phone') || '';

    const [history, setHistory] = useState<ConversationHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const customer = customers.find(c => c.customer_id === customerId);

    useEffect(() => {
        async function loadHistory() {
            if (!phone) return;
            try {
                const data = await fetchCustomerHistory(phone);
                setHistory(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to load customer history:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadHistory();
    }, [phone]);

    if (!customer && !isLoading) {
        return (
            <div className="p-6">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <div className="mt-8 text-center text-muted-foreground">
                    Customer not found
                </div>
            </div>
        );
    }

    const category = categorizeMessage(customer?.message || null);

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 overflow-hidden">
            {/* Header */}
            <div className="flex-none flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-muted shrink-0">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Customer Information</h1>
                    <p className="text-muted-foreground text-xs">Details and interaction history.</p>
                </div>
            </div>

            <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0 space-y-4">
                <TabsList className="flex-none bg-muted/50 p-1 self-start">
                    <TabsTrigger value="details" className="px-6 py-1.5 text-sm">Main Details</TabsTrigger>
                    <TabsTrigger value="history" className="px-6 py-1.5 text-sm">History</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="flex-1 min-h-0 overflow-y-auto custom-scrollbar-hidden space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Customer Summary */}
                        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                            <CardHeader className="py-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <User className={`w-4 h-4 ${themeClasses.iconPrimary}`} />
                                    Customer Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 pb-4">
                                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Name</p>
                                        <p className="font-semibold text-sm">{customer?.name || 'User'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Phone</p>
                                        <p className={`font-semibold text-sm ${themeClasses.textPrimary}`}>+{customer?.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Enquiry Date</p>
                                        <p className="font-semibold text-sm">{customer?.message_time || '-'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Category Details */}
                        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                            <CardHeader className="py-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Tag className={`w-4 h-4 ${themeClasses.iconPrimary}`} />
                                    Category Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <div className={`flex items-center gap-3 p-3 rounded-xl ${themeClasses.cardPrimary}`}>
                                                                                    <Tag className={`w-5 h-5 ${themeClasses.iconPrimaryDark}`} />
                                                                                    <div>
                                                                                        <p className={`text-xs font-medium ${themeClasses.textPrimaryDark} dark:${themeClasses.textPrimaryLight}`}>Detected Category</p>
                                                                                        <Badge className={`mt-1 ${themeClasses.bgPrimary} ${themeClasses.bgPrimaryHover} border-none px-2 py-0.5 text-[10px]`}>
                                            {category}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Latest Enquiry */}
                    <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="py-4">
                            <CardTitle className="text-base">Latest Enquiry</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <div className="bg-muted/50 p-4 rounded-xl border border-border/50 relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-1 h-full ${themeClasses.bgPrimary}`} />
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{customer?.message}</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history" className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card className="flex-1 flex flex-col min-h-0 border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
                        <CardHeader className="flex-none border-b bg-muted/10 py-4">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Calendar className={`w-4 h-4 ${themeClasses.iconPrimary}`} />
                                Conversation History
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4">
                                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500/20 border-t-emerald-500" />
                                    <p className="text-muted-foreground animate-pulse text-xs">Loading interaction history...</p>
                                </div>
                            ) : history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                        <Tag className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-lg font-semibold mb-1">No history found</p>
                                    <p className="text-muted-foreground text-xs max-w-[250px]">
                                        There are no recorded interactions for this customer yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="h-full p-4 md:p-6 space-y-4 overflow-y-auto scroll-smooth custom-scrollbar-hidden">
                                    {history.map((item, index) => (
                                        <MessageBubble
                                            key={index}
                                            content={item.content}
                                            name={item.name}
                                            timestamp={item.timestamp}
                                            role={item.role}
                                        />
                                    ))}
                                    <div className="h-4" />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function CustomerDetailPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col h-[calc(100vh-120px)] p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-12 w-64" />
                <div className="grid gap-4 md:grid-cols-2 flex-1">
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            </div>
        }>
            <CustomerDetailContent />
        </Suspense>
    );
}

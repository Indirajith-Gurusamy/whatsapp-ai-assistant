'use client';

import { useEffect, useState } from 'react';
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

export default function CustomerDetailPage() {
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
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-2xl md:text-3xl font-bold">Customer Information</h1>
            </div>

            <Tabs defaultValue="details" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="details">Main Details</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Customer Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Customer Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <User className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Name</p>
                                        <p className="font-medium">{customer?.name || 'User'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Phone</p>
                                        <p className="font-medium">+{customer?.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Enquiry Date</p>
                                        <p className="font-medium">{customer?.message_time || '-'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Category Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Category Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <Tag className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Detected Category</p>
                                        <Badge variant="secondary" className="mt-1">
                                            {category}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Latest Enquiry */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Latest Enquiry</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <p className="text-sm whitespace-pre-wrap">{customer?.message}</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Conversation History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                                </div>
                            ) : history.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No conversation history found
                                </p>
                            ) : (
                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                    {history.map((item, index) => (
                                        <MessageBubble
                                            key={index}
                                            content={item.content}
                                            name={item.name}
                                            timestamp={item.timestamp}
                                            role={item.role}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

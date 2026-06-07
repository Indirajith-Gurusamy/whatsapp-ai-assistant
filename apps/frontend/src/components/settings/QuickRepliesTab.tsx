'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { quickRepliesApi } from '@/lib/api';
import type { QuickReply } from '@/types';
import { Button } from '@/components/ui/button';
import { FloatingInput } from '@/components/ui/floating-input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { settingsFormWrap } from '@/components/settings/settings-layout';

export function QuickRepliesTab({ embedded = false }: { embedded?: boolean }) {
    const [items, setItems] = useState<QuickReply[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setItems(await quickRepliesApi.listManage());
        } catch {
            toast.error('Failed to load quick replies');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const handleCreate = async () => {
        if (!title.trim() || !body.trim()) {
            toast.error('Title and body required');
            return;
        }
        try {
            await quickRepliesApi.create({ title: title.trim(), body: body.trim() });
            setTitle('');
            setBody('');
            toast.success('Quick reply added');
            await load();
        } catch {
            toast.error('Failed to create');
        }
    };

    const handleDelete = async (uuid: string) => {
        if (!window.confirm('Delete this quick reply?')) return;
        try {
            await quickRepliesApi.remove(uuid);
            toast.success('Removed');
            await load();
        } catch {
            toast.error('Failed to delete');
        }
    };

    if (loading) {
        return (
            <div className={embedded ? 'space-y-3' : 'space-y-4'}>
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                ))}
            </div>
        );
    }

    return (
        <div className={embedded ? 'space-y-5' : settingsFormWrap}>
            {!embedded && (
                <p className="text-sm text-muted-foreground">
                    Canned responses appear in the chat composer when AI is off.
                </p>
            )}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <FloatingInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <FloatingInput label="Message body" value={body} onChange={(e) => setBody(e.target.value)} />
                <Button type="button" onClick={handleCreate} className="gap-1">
                    <Plus className="w-4 h-4" /> Add quick reply
                </Button>
            </div>
            <ul className="space-y-2">
                {items.map((item) => (
                    <li
                        key={item.uuid}
                        className="flex items-start justify-between gap-2 p-3 border rounded-lg"
                    >
                        <div className="min-w-0">
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.body}</p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.uuid)}
                        >
                            <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { knowledgeApi } from '@/lib/api';
import type { KnowledgeDocument } from '@/types';
import { Button } from '@/components/ui/button';
import { FloatingInput } from '@/components/ui/floating-input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Upload, Trash2 } from 'lucide-react';
import { settingsFormWrap } from '@/components/settings/settings-layout';

export function KnowledgeTab({ embedded = false }: { embedded?: boolean }) {
    const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [uploading, setUploading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setDocs(await knowledgeApi.list());
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to load knowledge base';
            toast.error(msg.includes('schema') || msg.includes('503')
                ? 'Database needs migration. Run: python scripts/db.py push local'
                : msg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !title.trim()) {
            toast.error('Enter a title and choose a file');
            return;
        }
        setUploading(true);
        try {
            await knowledgeApi.upload(title.trim(), file);
            toast.success('Document indexed');
            setTitle('');
            e.target.value = '';
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (uuid: string) => {
        if (!window.confirm('Delete this document from the knowledge base?')) return;
        try {
            await knowledgeApi.remove(uuid);
            toast.success('Document removed');
            await load();
        } catch {
            toast.error('Failed to delete');
        }
    };

    if (loading) {
        return (
            <div className={embedded ? 'space-y-3' : 'space-y-4'}>
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                ))}
            </div>
        );
    }

    return (
        <div className={embedded ? 'space-y-5' : settingsFormWrap}>
            {!embedded && (
                <p className="text-sm text-muted-foreground">
                    Upload FAQs or PDFs. Relevant chunks are injected into the WhatsApp AI system prompt on each reply.
                </p>
            )}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <FloatingInput label="Document title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <label className="inline-flex cursor-pointer">
                    <input
                        type="file"
                        accept=".txt,.md,.pdf"
                        className="hidden"
                        onChange={handleUpload}
                        disabled={uploading}
                    />
                    <Button type="button" variant="outline" className="gap-1 pointer-events-none" tabIndex={-1}>
                        <Upload className="w-4 h-4" />
                        {uploading ? 'Uploading…' : 'Upload .txt, .md, or .pdf'}
                    </Button>
                </label>
            </div>
            <ul className="space-y-2">
                {docs.map((doc) => (
                    <li
                        key={doc.uuid}
                        className="flex items-center justify-between gap-2 p-3 border rounded-lg"
                    >
                        <div>
                            <p className="font-medium text-sm">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                                {doc.chunk_count} chunks · {doc.filename || 'text'}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(doc.uuid)}
                        >
                            <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

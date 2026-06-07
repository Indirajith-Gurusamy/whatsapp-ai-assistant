'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PromptDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    placeholder?: string;
    defaultValue?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: (value: string) => void;
}

function PromptDialogForm({
    title,
    description,
    placeholder,
    defaultValue,
    confirmLabel,
    cancelLabel,
    onOpenChange,
    onConfirm,
}: Omit<PromptDialogProps, 'open'>) {
    const [value, setValue] = useState(defaultValue ?? '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }, 0);
        return () => window.clearTimeout(timer);
    }, []);

    const handleConfirm = () => {
        const trimmed = value.trim();
        if (!trimmed) return;
        onConfirm(trimmed);
        onOpenChange(false);
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                {description ? (
                    <DialogDescription>{description}</DialogDescription>
                ) : null}
            </DialogHeader>
            <Input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirm();
                    }
                }}
                className="h-10 border-orange-400 focus-visible:ring-orange-400"
            />
            <DialogFooter className="gap-3 pt-2 sm:justify-end">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="h-10 min-w-[7.5rem] px-5"
                >
                    {cancelLabel}
                </Button>
                <Button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!value.trim()}
                    className={cn(
                        'h-10 min-w-[7.5rem] px-5',
                        'bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white',
                    )}
                >
                    {confirmLabel}
                </Button>
            </DialogFooter>
        </>
    );
}

export function PromptDialog({
    open,
    onOpenChange,
    title,
    description,
    placeholder,
    defaultValue = '',
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
    onConfirm,
}: PromptDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]" showCloseButton={false}>
                {open ? (
                    <PromptDialogForm
                        key={defaultValue}
                        title={title}
                        description={description}
                        placeholder={placeholder}
                        defaultValue={defaultValue}
                        confirmLabel={confirmLabel}
                        cancelLabel={cancelLabel}
                        onOpenChange={onOpenChange}
                        onConfirm={onConfirm}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

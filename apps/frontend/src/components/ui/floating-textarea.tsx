'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FloatingTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'placeholder'> {
    label: string;
    error?: string;
}

const FloatingTextarea = React.forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(
    ({ className, label, error, id, value, ...props }, ref) => {
        const [isFocused, setIsFocused] = React.useState(false);
        const generatedId = React.useId();
        const hasValue = value !== undefined && value !== null && value !== '';
        const isFloating = isFocused || hasValue;

        const inputId = id || `floating-textarea-${generatedId}`;

        return (
            <div className="relative w-full">
                <textarea
                    id={inputId}
                    ref={ref}
                    value={value}
                    className={cn(
                        'peer min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 pt-5 pb-2 text-sm transition-colors resize-y',
                        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        error && 'border-red-500 focus-visible:ring-red-500',
                        className
                    )}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder=" " // Required for CSS peer selector
                    {...props}
                />
                <label
                    htmlFor={inputId}
                    className={cn(
                        'absolute left-3 top-4 text-sm text-muted-foreground transition-all duration-200 pointer-events-none px-1',
                        'peer-focus:-top-2 peer-focus:text-xs peer-focus:text-orange-600 peer-focus:bg-background',
                        'peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-background',
                        isFloating && '-top-2 text-xs text-orange-600 bg-background',
                        error && 'text-red-500 peer-focus:text-red-500',
                        props.disabled && 'opacity-50'
                    )}
                >
                    {label}
                </label>
                {error && (
                    <p className="mt-1 text-xs text-red-500">{error}</p>
                )}
            </div>
        );
    }
);

FloatingTextarea.displayName = 'FloatingTextarea';

export { FloatingTextarea };

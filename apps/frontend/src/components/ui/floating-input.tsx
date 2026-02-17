'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FloatingInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
    label: string;
    error?: string;
}

function renderLabel(label: string) {
    if (label.endsWith('*')) {
        return (
            <>
                {label.slice(0, -1)}
                <span className="text-red-500">*</span>
            </>
        );
    }
    return label;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
    ({ className, label, error, type = 'text', id, value, ...props }, ref) => {
        const [focused, setFocused] = React.useState(false);
        const hasValue = value !== undefined && value !== null && value !== '';
        const isFloating = focused || hasValue;

        const inputId = id || `floating-input-${React.useId()}`;

        return (
            <div className="relative w-full">
                <input
                    type={type}
                    id={inputId}
                    ref={ref}
                    value={value}
                    onFocus={(e) => {
                        setFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setFocused(false);
                        props.onBlur?.(e);
                    }}
                    placeholder=""
                    className={cn(
                        'peer h-[52px] w-full rounded-lg border bg-transparent px-3 pt-5 pb-2 text-sm transition-colors outline-none',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        error
                            ? 'border-red-500 focus:border-red-500'
                            : focused
                                ? 'border-orange-500'
                                : 'border-input',
                        className
                    )}
                    {...props}
                />
                <label
                    htmlFor={inputId}
                    className={cn(
                        'absolute left-2.5 z-10 pointer-events-none transition-all duration-200 px-1',
                        isFloating
                            ? 'floating-label-bg text-xs font-medium'
                            : 'top-1/2 -translate-y-1/2 text-sm',
                        error
                            ? 'text-red-500'
                            : isFloating
                                ? 'text-orange-500'
                                : 'text-muted-foreground'
                    )}
                    style={isFloating ? { top: 0, transform: 'translateY(-50%)' } : undefined}
                >
                    {renderLabel(label)}
                </label>
                {error && (
                    <p className="mt-1 text-xs text-red-500">{error}</p>
                )}
            </div>
        );
    }
);

FloatingInput.displayName = 'FloatingInput';

export { FloatingInput, renderLabel };

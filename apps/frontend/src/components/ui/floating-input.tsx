'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    endIcon?: React.ReactNode;
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
    ({ label, error, className, value, id, endIcon, ...props }, ref) => {
        const [focused, setFocused] = React.useState(false);

        const hasValue = value !== undefined && value !== null && String(value).length > 0;
        const isFloating = focused || hasValue;

        return (
            <div className="relative">
                <input
                    {...props}
                    ref={ref}
                    id={id}
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
                        'peer flex w-full rounded-lg border bg-transparent px-3 text-sm transition-colors outline-none',
                        'h-[52px] pt-5 pb-2',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        error
                            ? 'border-red-500 focus:border-red-500'
                            : focused
                                ? 'border-orange-500'
                                : 'border-input',
                        endIcon && 'pr-10',
                        className
                    )}
                />
                <label
                    htmlFor={id}
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
                {endIcon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {endIcon}
                    </div>
                )}
                {error && (
                    <p className="text-xs text-red-500 mt-1">{error}</p>
                )}
            </div>
        );
    }
);

FloatingInput.displayName = 'FloatingInput';

export { FloatingInput, renderLabel };

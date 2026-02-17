'use client';

import * as React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderLabel } from '@/components/ui/floating-input';

export interface SelectOption {
    value: string;
    label: string;
    code?: string;
}

interface SearchableSelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    className?: string;
    showFlags?: boolean;
}

function CountryFlag({ code, size = 20 }: { code: string; size?: number }) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
            alt={code}
            width={size}
            height={Math.round(size * 0.75)}
            className="inline-block object-contain"
            style={{ width: size, height: Math.round(size * 0.75) }}
        />
    );
}

export function SearchableSelect({
    options,
    value,
    onChange,
    label,
    placeholder = 'Select...',
    searchPlaceholder = 'Search',
    emptyMessage = 'No results found.',
    disabled = false,
    className,
    showFlags = false,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [visible, setVisible] = React.useState(false);
    const [animating, setAnimating] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [openAbove, setOpenAbove] = React.useState(false);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const [maxListHeight, setMaxListHeight] = React.useState(200);

    const selectedOption = options.find(o => o.value === value);
    const hasValue = !!value;
    const isFloating = open || hasValue;

    const filteredOptions = React.useMemo(() => {
        if (!search.trim()) return options;
        const q = search.toLowerCase();
        return options.filter(o => o.label.toLowerCase().includes(q));
    }, [options, search]);

    React.useEffect(() => {
        if (open) {
            setVisible(true);
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom - 16;
                const spaceAbove = rect.top - 16;
                const searchBarHeight = 45;
                const minRequired = 150;

                if (spaceBelow < minRequired && spaceAbove > spaceBelow) {
                    setOpenAbove(true);
                    const available = Math.max(spaceAbove - searchBarHeight - 8, 80);
                    setMaxListHeight(available);
                } else {
                    setOpenAbove(false);
                    const available = Math.max(spaceBelow - searchBarHeight - 8, 80);
                    setMaxListHeight(available);
                }
            }
            setSearch('');
            requestAnimationFrame(() => {
                setAnimating(true);
                setTimeout(() => searchInputRef.current?.focus(), 0);
            });
        } else {
            setAnimating(false);
            const timer = setTimeout(() => setVisible(false), 150);
            return () => clearTimeout(timer);
        }
    }, [open]);

    React.useEffect(() => {
        if (!visible) return;
        function handleClickOutside(e: MouseEvent) {
            if (
                triggerRef.current?.contains(e.target as Node) ||
                dropdownRef.current?.contains(e.target as Node)
            ) return;
            setOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [visible]);

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                type="button"
                role="combobox"
                aria-expanded={open}
                disabled={disabled}
                onClick={() => !disabled && setOpen(prev => !prev)}
                className={cn(
                    'flex w-full h-[52px] items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm transition-colors outline-none',
                    label ? 'pt-5 pb-2' : 'py-2',
                    open && 'border-orange-500',
                    !value && !label && 'text-muted-foreground',
                    disabled && 'opacity-50 cursor-not-allowed',
                    className
                )}
            >
                <span className="flex items-center gap-2 truncate">
                    {showFlags && selectedOption?.code && (
                        <CountryFlag code={selectedOption.code} size={20} />
                    )}
                    {label ? (
                        hasValue ? selectedOption?.label : ''
                    ) : (
                        selectedOption?.label || placeholder
                    )}
                </span>
                <ChevronDown className={cn(
                    'ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform',
                    open && 'rotate-180'
                )} />
            </button>

            {label && (
                <span
                    className={cn(
                        'absolute left-2.5 z-10 pointer-events-none transition-all duration-200 px-1',
                        isFloating
                            ? 'text-xs font-medium floating-label-bg'
                            : 'top-1/2 -translate-y-1/2 text-sm',
                        isFloating
                            ? 'text-orange-500'
                            : 'text-muted-foreground'
                    )}
                    style={isFloating ? { top: 0, transform: 'translateY(-50%)' } : undefined}
                >
                    {renderLabel(label)}
                </span>
            )}

            {visible && (
                <div
                    ref={dropdownRef}
                    className={cn(
                        'absolute left-0 z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md',
                        'transition-all duration-150 ease-out',
                        openAbove
                            ? 'bottom-full mb-1 origin-bottom'
                            : 'top-full mt-1 origin-top',
                        animating
                            ? 'opacity-100 scale-y-100 translate-y-0'
                            : openAbove
                                ? 'opacity-0 scale-y-95 translate-y-1'
                                : 'opacity-0 scale-y-95 -translate-y-1'
                    )}
                    style={{ maxHeight: maxListHeight + 50 }}
                >
                    <div className="flex items-center gap-2 border-b px-3 h-[45px]">
                        <Search className="size-4 shrink-0 opacity-50" />
                        <input
                            ref={searchInputRef}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                    </div>
                    <div
                        className="overflow-y-auto overflow-x-hidden p-1"
                        style={{ maxHeight: maxListHeight }}
                    >
                        {filteredOptions.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                {emptyMessage}
                            </div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = option.value === value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(option.value === value ? '' : option.value);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer select-none',
                                            isSelected
                                                ? 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-100'
                                                : 'hover:bg-accent hover:text-accent-foreground'
                                        )}
                                    >
                                        {showFlags && option.code ? (
                                            <CountryFlag code={option.code} size={20} />
                                        ) : (
                                            <Check
                                                className={cn(
                                                    'h-4 w-4 shrink-0',
                                                    isSelected ? 'opacity-100' : 'opacity-0'
                                                )}
                                            />
                                        )}
                                        {option.label}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

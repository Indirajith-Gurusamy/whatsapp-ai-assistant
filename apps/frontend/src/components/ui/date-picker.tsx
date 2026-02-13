'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { renderLabel } from '@/components/ui/floating-input';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}
function startDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

function formatDisplay(d: Date) {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}/${dd}/${d.getFullYear()}`;
}

function parseIsoDate(iso: string): Date | null {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

function toIso(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

function parseTypedDate(text: string): Date | null {
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    const [, mm, dd, yyyy] = match;
    const m = parseInt(mm, 10);
    const d = parseInt(dd, 10);
    const y = parseInt(yyyy, 10);
    if (m < 1 || m > 12) return null;
    if (d < 1 || d > daysInMonth(y, m - 1)) return null;
    if (y < 1920 || y > new Date().getFullYear()) return null;
    return new Date(y, m - 1, d);
}

function autoFormatDateText(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

function yearRange() {
    const now = new Date().getFullYear();
    const years: number[] = [];
    for (let y = now; y >= 1920; y--) years.push(y);
    return years;
}

// ── Inline dropdown ──────────────────────────────────────
function InlineDropdown({
    label,
    items,
    value,
    onChange,
}: {
    label: string;
    items: { label: string; value: number }[];
    value: number;
    onChange: (v: number) => void;
}) {
    const [open, setOpen] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open && listRef.current) {
            const el = listRef.current.querySelector('[data-selected="true"]');
            el?.scrollIntoView({ block: 'center' });
        }
    }, [open]);

    const selected = items.find((i) => i.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="inline-flex items-center gap-0.5 text-sm font-semibold hover:text-orange-600 transition-colors cursor-pointer"
                >
                    {selected?.label ?? label}
                    <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto min-w-[120px] p-1 max-h-[220px] overflow-y-auto"
                align="center"
                sideOffset={4}
            >
                <div ref={listRef} className="flex flex-col">
                    {items.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            data-selected={item.value === value}
                            onClick={() => {
                                onChange(item.value);
                                setOpen(false);
                            }}
                            className={cn(
                                'text-left px-3 py-1.5 text-sm rounded-md transition-colors',
                                item.value === value
                                    ? 'bg-orange-50 text-orange-600 font-medium dark:bg-orange-950'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800',
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

// ── DatePicker component ─────────────────────────────────
interface DatePickerProps {
    value?: string;
    onChange?: (iso: string) => void;
    placeholder?: string;
    className?: string;
    id?: string;
    disabled?: boolean;
    label?: string;
}

export function DatePicker({
    value,
    onChange,
    placeholder = 'MM/DD/YYYY',
    className,
    id,
    disabled,
    label,
}: DatePickerProps) {
    const parsed = useMemo(() => parseIsoDate(value || ''), [value]);
    const today = new Date();

    const [open, setOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());
    const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());

    // Text input state — the trigger IS the input
    const [typedText, setTypedText] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (parsed) {
            setViewMonth(parsed.getMonth());
            setViewYear(parsed.getFullYear());
        }
    }, [parsed]);

    // When popover closes, reset typed text
    useEffect(() => {
        if (!open) {
            setTypedText('');
            setIsFocused(false);
        }
    }, [open]);

    const totalDays = daysInMonth(viewYear, viewMonth);
    const startDay = startDayOfMonth(viewYear, viewMonth);
    const years = useMemo(() => yearRange(), []);

    const monthItems = MONTHS.map((m, i) => ({ label: m, value: i }));
    const yearItems = years.map((y) => ({ label: String(y), value: y }));

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const selectDay = (day: number) => {
        const d = new Date(viewYear, viewMonth, day);
        onChange?.(toIso(d));
        setOpen(false);
    };

    const isSelected = (day: number) =>
        parsed?.getDate() === day &&
        parsed?.getMonth() === viewMonth &&
        parsed?.getFullYear() === viewYear;

    const isToday = (day: number) =>
        today.getDate() === day &&
        today.getMonth() === viewMonth &&
        today.getFullYear() === viewYear;

    const handleTextInput = (raw: string) => {
        // Only auto-format when adding characters, not when deleting
        const isDeleting = raw.length < typedText.length;
        const formatted = isDeleting ? raw : autoFormatDateText(raw);
        setTypedText(formatted);

        const parsedDate = parseTypedDate(formatted);
        if (parsedDate) {
            setViewMonth(parsedDate.getMonth());
            setViewYear(parsedDate.getFullYear());
            setTimeout(() => {
                onChange?.(toIso(parsedDate));
                setOpen(false);
            }, 400);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
        }
        if (e.key === 'Enter') {
            const parsedDate = parseTypedDate(typedText);
            if (parsedDate) {
                onChange?.(toIso(parsedDate));
                setOpen(false);
            }
        }
    };

    const handleInputFocus = () => {
        setIsFocused(true);
        // Pre-populate with existing date so the field isn't blank
        if (parsed && !typedText) {
            setTypedText(formatDisplay(parsed));
        }
        setOpen(true);
    };

    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const displayValue = parsed ? formatDisplay(parsed) : '';

    // Show typed text when focused, otherwise the formatted date
    const inputValue = isFocused ? typedText : displayValue;

    const hasValue = !!displayValue;
    const isFloating = isFocused || hasValue;

    return (
        <Popover open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
            <PopoverPrimitive.Anchor asChild>
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        id={id}
                        disabled={disabled}
                        value={inputValue}
                        onChange={(e) => handleTextInput(e.target.value)}
                        onFocus={handleInputFocus}
                        onClick={() => setOpen(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={handleKeyDown}
                        placeholder={label ? (isFocused && !inputValue ? placeholder : '') : placeholder}
                        maxLength={10}
                        className={cn(
                            'flex w-full rounded-lg border bg-transparent px-3 text-sm transition-colors outline-none',
                            label ? 'h-[52px] pt-5 pb-2' : 'h-11 py-1',
                            isFocused ? 'border-orange-500' : 'border-input',
                            'disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-muted-foreground',
                            className,
                        )}
                    />
                    {label && (
                        <label
                            htmlFor={id}
                            className={cn(
                                'absolute left-2.5 z-10 pointer-events-none transition-all duration-200 px-1',
                                isFloating
                                    ? 'floating-label-bg text-xs font-medium'
                                    : 'top-1/2 -translate-y-1/2 text-sm',
                                isFloating ? 'text-orange-500' : 'text-muted-foreground'
                            )}
                            style={isFloating ? { top: 0, transform: 'translateY(-50%)' } : undefined}
                        >
                            {renderLabel(label)}
                        </label>
                    )}
                </div>
            </PopoverPrimitive.Anchor>

            <PopoverContent
                className="w-[280px] p-0"
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <div className="p-3">
                    {/* ── Header: nav arrows + month/year pickers ── */}
                    <div className="flex items-center justify-between mb-3">
                        <button
                            type="button"
                            onClick={prevMonth}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-2">
                            <InlineDropdown
                                label="Month"
                                items={monthItems}
                                value={viewMonth}
                                onChange={setViewMonth}
                            />
                            <InlineDropdown
                                label="Year"
                                items={yearItems}
                                value={viewYear}
                                onChange={setViewYear}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={nextMonth}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* ── Day-of-week headers ── */}
                    <div className="grid grid-cols-7 mb-1">
                        {DAYS.map((d) => (
                            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1.5">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* ── Calendar grid ── */}
                    <div className="grid grid-cols-7 gap-y-0.5">
                        {cells.map((day, i) => (
                            <div key={i} className="flex items-center justify-center">
                                {day ? (
                                    <button
                                        type="button"
                                        onClick={() => selectDay(day)}
                                        className={cn(
                                            'w-8 h-8 rounded-md text-sm transition-colors',
                                            isSelected(day)
                                                ? 'bg-orange-500 text-white font-semibold'
                                                : isToday(day)
                                                    ? 'border border-orange-400 text-orange-600 font-medium'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800',
                                        )}
                                    >
                                        {day}
                                    </button>
                                ) : (
                                    <span className="w-8 h-8" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

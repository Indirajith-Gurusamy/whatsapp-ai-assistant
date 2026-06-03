'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, GripVertical, Loader2, MessageCircle, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { themeClasses } from '@/lib/theme';
import { assistantApi, type AssistantChatMessage } from '@/lib/api';

const ASSISTANT_NAME = 'Vivafy';

const WELCOME: AssistantChatMessage = {
    role: 'assistant',
    content:
        "Hi! I'm Vivafy — I can help you find your way around this app — leads, customers, settings, AI toggles, and more. What do you need?",
};

const POSITION_KEY = 'app-assistant-anchor-v3';
const FAB_SIZE = 56;
const PANEL_WIDTH = 380;
const PANEL_MIN_HEIGHT = 280;
const EDGE = 16;
const DRAG_THRESHOLD = 5;

/** FAB bottom-left corner distance from viewport left / bottom (px). */
type Anchor = { left: number; bottom: number };

type Expand = 'left' | 'right';

type ViewportRect = { left: number; top: number; width: number; height: number };

function getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return 'Something went wrong. Please try again.';
}

function normalizeAnchor(anchor: Anchor | null | undefined): Anchor {
    if (
        anchor &&
        typeof anchor.left === 'number' &&
        typeof anchor.bottom === 'number' &&
        Number.isFinite(anchor.left) &&
        Number.isFinite(anchor.bottom)
    ) {
        return anchor;
    }
    return getDefaultAnchor();
}

function fabRightEdge(anchor: Anchor): number {
    return normalizeAnchor(anchor).left + FAB_SIZE;
}

/** Open toward the side with more horizontal room. */
function getExpandDirection(anchor: Anchor | null | undefined): Expand {
    const { left } = normalizeAnchor(anchor);
    const vw = window.innerWidth;
    const spaceRight = vw - left - EDGE;
    const spaceLeft = left + FAB_SIZE - EDGE;
    return spaceLeft > spaceRight ? 'left' : 'right';
}

function horizontalSpace(anchor: Anchor, expand: Expand): number {
    const { left } = normalizeAnchor(anchor);
    const vw = window.innerWidth;
    return expand === 'right' ? vw - left - EDGE : left + FAB_SIZE - EDGE;
}

function panelWidthPx(anchor: Anchor | null | undefined, expand: Expand): number {
    const cap = Math.min(PANEL_WIDTH, window.innerWidth - EDGE * 2);
    const available = horizontalSpace(normalizeAnchor(anchor), expand);
    return Math.min(cap, available);
}

/** Vertical space from anchor bottom up to the top safe edge. */
function panelHeightPx(anchor: Anchor | null | undefined): number {
    const { bottom } = normalizeAnchor(anchor);
    const available = window.innerHeight - bottom - EDGE;
    return Math.max(PANEL_MIN_HEIGHT, available);
}

function widgetSize(
    open: boolean,
    anchor: Anchor | null | undefined,
): { width: number; height: number; expand: Expand } {
    const safe = normalizeAnchor(anchor);
    if (open) {
        const expand = getExpandDirection(safe);
        return {
            width: panelWidthPx(safe, expand),
            height: panelHeightPx(safe),
            expand,
        };
    }
    return { width: FAB_SIZE, height: FAB_SIZE, expand: 'right' };
}

function getDefaultAnchor(): Anchor {
    if (typeof window === 'undefined') {
        return { left: EDGE, bottom: EDGE };
    }
    return {
        left: window.innerWidth - FAB_SIZE - EDGE,
        bottom: EDGE,
    };
}

function loadAnchor(): Anchor | null {
    if (typeof window === 'undefined') return null;
    const vw = window.innerWidth;
    try {
        const raw =
            sessionStorage.getItem(POSITION_KEY) ??
            sessionStorage.getItem('app-assistant-anchor-v2');
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Record<string, number>;
        if (typeof parsed.left === 'number' && typeof parsed.bottom === 'number') {
            return { left: parsed.left, bottom: parsed.bottom };
        }
        if (typeof parsed.right === 'number' && typeof parsed.bottom === 'number') {
            return { left: vw - parsed.right - FAB_SIZE, bottom: parsed.bottom };
        }
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return { left: parsed.x, bottom: window.innerHeight - parsed.y - FAB_SIZE };
        }
    } catch {
        /* ignore */
    }
    return null;
}

/** Convert FAB anchor to widget top-left rect (panel may extend left or right of FAB). */
function anchorToRect(anchor: Anchor | null | undefined, open: boolean): ViewportRect {
    const safe = normalizeAnchor(anchor);
    const { width, height, expand } = widgetSize(open, safe);
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left =
        open && expand === 'left' ? fabRightEdge(safe) - width : safe.left;
    let top = vh - safe.bottom - height;

    const maxLeft = vw - width - EDGE;
    const maxTop = vh - height - EDGE;

    left = Math.max(EDGE, Math.min(maxLeft, left));
    top = Math.max(EDGE, Math.min(maxTop, top));

    return { left, top, width, height };
}

/** Map dragged widget rect back to FAB anchor (keeps FAB corner when panel expands left). */
function rectToFabAnchor(rect: ViewportRect, open: boolean, expand: Expand): Anchor {
    const vh = window.innerHeight;
    const bottom = vh - rect.top - rect.height;
    const fabLeft = open && expand === 'left' ? rect.left + rect.width - FAB_SIZE : rect.left;
    return { left: fabLeft, bottom };
}

/** Clamp FAB position only; open layout is derived from anchor + expand direction. */
function clampAnchorSafe(anchor: Anchor | null | undefined): Anchor {
    const { left, bottom } = normalizeAnchor(anchor);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
        left: Math.max(EDGE, Math.min(vw - FAB_SIZE - EDGE, left)),
        bottom: Math.max(EDGE, Math.min(vh - FAB_SIZE - EDGE, bottom)),
    };
}

function anchorsEqual(a: Anchor, b: Anchor): boolean {
    return Math.abs(a.left - b.left) < 0.5 && Math.abs(a.bottom - b.bottom) < 0.5;
}

export function AppAssistant() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<AssistantChatMessage[]>([WELCOME]);
    const [isLoading, setIsLoading] = useState(false);
    const [anchor, setAnchor] = useState<Anchor | null>(null);
    const [viewport, setViewport] = useState({ w: 0, h: 0 });
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const anchorRef = useRef<Anchor>(getDefaultAnchor());
    const openRef = useRef(false);
    const dragState = useRef({
        active: false,
        pointerId: -1,
        startX: 0,
        startY: 0,
        originLeft: 0,
        originTop: 0,
        expand: 'right' as Expand,
        moved: false,
    });

    openRef.current = open;

    const commitAnchor = useCallback((next: Anchor | null | undefined) => {
        const safe = clampAnchorSafe(next);
        anchorRef.current = safe;
        setAnchor((prev) => (prev && anchorsEqual(prev, safe) ? prev : safe));
    }, []);

    useEffect(() => {
        const updateViewport = () => {
            setViewport({ w: window.innerWidth, h: window.innerHeight });
            commitAnchor(anchorRef.current);
        };
        commitAnchor(loadAnchor() ?? getDefaultAnchor());
        setViewport({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, [commitAnchor]);

    const rect = useMemo(() => {
        if (viewport.w === 0) return null;
        return anchorToRect(anchor ?? anchorRef.current, open);
    }, [anchor, open, viewport.w, viewport.h]);

    useEffect(() => {
        commitAnchor(anchorRef.current);
    }, [open, commitAnchor]);

    useEffect(() => {
        if (open && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, open, isLoading]);

    useEffect(() => {
        if (open) {
            const t = setTimeout(() => inputRef.current?.focus(), 100);
            return () => clearTimeout(t);
        }
    }, [open]);

    const persistAnchor = useCallback((value: Anchor) => {
        try {
            sessionStorage.setItem(POSITION_KEY, JSON.stringify(value));
        } catch {
            /* ignore */
        }
    }, []);

    const onDragPointerDown = useCallback(
        (e: React.PointerEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-assistant-drag]')) return;

            const current = anchorToRect(anchorRef.current, openRef.current);
            const { expand } = widgetSize(openRef.current, anchorRef.current);
            dragState.current = {
                active: true,
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                originLeft: current.left,
                originTop: current.top,
                expand,
                moved: false,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
            e.preventDefault();
        },
        [],
    );

    const onDragPointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragState.current.active || dragState.current.pointerId !== e.pointerId) return;

        const dx = e.clientX - dragState.current.startX;
        const dy = e.clientY - dragState.current.startY;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
            dragState.current.moved = true;
        }

        const { width, height } = widgetSize(openRef.current, anchorRef.current);
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const expand = dragState.current.expand;

        let left = dragState.current.originLeft + dx;
        let top = dragState.current.originTop + dy;

        left = Math.max(EDGE, Math.min(vw - width - EDGE, left));
        top = Math.max(EDGE, Math.min(vh - height - EDGE, top));

        commitAnchor(
            rectToFabAnchor({ left, top, width, height }, openRef.current, expand),
        );
    }, [commitAnchor]);

    const endDrag = useCallback(
        (e: React.PointerEvent) => {
            if (!dragState.current.active || dragState.current.pointerId !== e.pointerId) return;
            dragState.current.active = false;
            persistAnchor(anchorRef.current);
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
                /* ignore */
            }
        },
        [persistAnchor],
    );

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const userMsg: AssistantChatMessage = { role: 'user', content: text };
        const historyForApi = messages.filter((m) => m !== WELCOME);
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const { reply } = await assistantApi.chat({
                message: text,
                history: historyForApi,
                pathname: pathname ?? undefined,
            });
            setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        } catch (err) {
            toast.error(getErrorMessage(err));
            setMessages((prev) => prev.slice(0, -1));
            setInput(text);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages, pathname]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void sendMessage();
        }
    };

    const toggleOpen = () => {
        if (dragState.current.moved) {
            dragState.current.moved = false;
            return;
        }
        setOpen((v) => !v);
    };

    if (viewport.w === 0 || rect === null) return null;

    return (
        <div
            className="fixed z-50 flex flex-col items-stretch select-none"
            style={{
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: open ? rect.height : undefined,
            }}
            onPointerMove={onDragPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
        >
            {!open && (
                <Button
                    type="button"
                    data-assistant-drag
                    onPointerDown={onDragPointerDown}
                    onClick={toggleOpen}
                    className={cn(
                        'h-14 w-14 shrink-0 cursor-grab self-start rounded-full shadow-lg active:cursor-grabbing',
                        themeClasses.btnPrimary,
                        'text-white',
                    )}
                    style={{ width: FAB_SIZE, height: FAB_SIZE }}
                    aria-label={`Open ${ASSISTANT_NAME}`}
                    aria-expanded={false}
                    title="Drag to move · Click to open"
                >
                    <MessageCircle className="h-6 w-6" />
                </Button>
            )}

            {open && (
                <div
                    className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                    role="dialog"
                    aria-label={ASSISTANT_NAME}
                >
                    <header
                        className={cn(
                            'flex shrink-0 items-center gap-2 px-3 py-3 text-white',
                            themeClasses.sidebarGradient,
                        )}
                    >
                        <div
                            data-assistant-drag
                            className="flex min-w-0 flex-1 cursor-grab items-center gap-2 active:cursor-grabbing"
                            onPointerDown={onDragPointerDown}
                            title="Drag to move"
                        >
                            <GripVertical className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                                <Bot className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold leading-tight">{ASSISTANT_NAME}</p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-white hover:bg-white/20"
                            onClick={() => setOpen(false)}
                            aria-label={`Close ${ASSISTANT_NAME}`}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </header>

                    <div
                        ref={scrollRef}
                        className="min-h-0 flex-1 overflow-y-auto bg-muted/30 px-4 py-3"
                    >
                        <div className="flex min-h-full flex-col justify-end gap-3">
                            {messages.map((msg, i) => (
                                <div
                                    key={`${msg.role}-${i}`}
                                    className={cn(
                                        'max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                                        msg.role === 'user'
                                            ? cn('ml-auto text-white', themeClasses.btnPrimary)
                                            : 'mr-auto border border-border/60 bg-card text-foreground shadow-sm',
                                    )}
                                >
                                    {msg.content}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="mr-auto flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-3 py-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Thinking…
                                </div>
                            )}
                        </div>
                    </div>

                    <footer className="shrink-0 border-t border-border/50 bg-card p-3">
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask how to use the app…"
                                rows={1}
                                disabled={isLoading}
                                className="min-h-[40px] max-h-24 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:opacity-60"
                            />
                            <Button
                                type="button"
                                size="icon"
                                disabled={isLoading || !input.trim()}
                                onClick={() => void sendMessage()}
                                className={cn(
                                    'h-10 w-10 shrink-0 rounded-full text-white',
                                    themeClasses.btnPrimary,
                                )}
                                aria-label="Send message"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </footer>
                </div>
            )}
        </div>
    );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bot, GripVertical, Loader2, MessageCircle, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { themeClasses } from '@/lib/theme';
import {
    assistantApi,
    type AssistantAction,
    type AssistantChatMessage,
} from '@/lib/api';
import { resolveClientActions } from '@/lib/assistant-intents';
import { dispatchUiAction, closeAssistant, VIVAFY_ASSISTANT_CLOSE_EVENT } from '@/lib/ui-actions';
import { hardRefreshPage, reloadView } from '@/lib/refresh-app-data';
import { useAuth } from '@/contexts/AuthContext';

function actionsMatch(a: AssistantAction, b: AssistantAction): boolean {
    if (a.type !== b.type) return false;
    if (a.type === 'navigate' && a.path && b.path) return a.path === b.path;
    if (a.user_id != null && b.user_id != null) return a.user_id === b.user_id;
    if (a.conversation_uuid && b.conversation_uuid) {
        return a.conversation_uuid === b.conversation_uuid;
    }
    if (a.path && b.path) return a.path === b.path;
    return a.label === b.label;
}

function actionExecuted(executed: AssistantAction[], action: AssistantAction): boolean {
    return executed.some((done) => actionsMatch(done, action));
}

const ASSISTANT_NAME = 'Vivafy';

type ChatEntry = AssistantChatMessage & {
    actions?: AssistantAction[];
    pendingActions?: AssistantAction[];
};

const WELCOME: ChatEntry = {
    role: 'assistant',
    content:
        "Hi! I'm Vivafy — tell me what to do: open pages, logout, change roles, assign leads, send messages, refresh, and more. I execute immediately.",
};

const POSITION_KEY = 'app-assistant-anchor-v3';
const FAB_SIZE = 56;
const PANEL_WIDTH = 380;
const PANEL_MIN_HEIGHT = 280;
const EDGE = 16;
const DRAG_THRESHOLD_MOUSE = 5;
const DRAG_THRESHOLD_TOUCH = 2;

function dragThreshold(pointerType: string): number {
    return pointerType === 'touch' ? DRAG_THRESHOLD_TOUCH : DRAG_THRESHOLD_MOUSE;
}

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
    const { logout } = useAuth();
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const router = useRouter();
    const [messages, setMessages] = useState<ChatEntry[]>([WELCOME]);
    const [executingAction, setExecutingAction] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [anchor, setAnchor] = useState<Anchor | null>(null);
    const [viewport, setViewport] = useState({ w: 0, h: 0 });
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const anchorRef = useRef<Anchor>(getDefaultAnchor());
    const openRef = useRef(false);
    const dragState = useRef({
        active: false,
        pointerId: -1,
        pointerType: 'mouse',
        startX: 0,
        startY: 0,
        originLeft: 0,
        originTop: 0,
        expand: 'right' as Expand,
        moved: false,
        cleanup: null as (() => void) | null,
    });

    openRef.current = open;

    const dismiss = useCallback(() => setOpen(false), []);

    useEffect(() => {
        const onClose = () => dismiss();
        window.addEventListener(VIVAFY_ASSISTANT_CLOSE_EVENT, onClose);
        return () => window.removeEventListener(VIVAFY_ASSISTANT_CLOSE_EVENT, onClose);
    }, [dismiss]);

    const pathnameRef = useRef(pathname);
    useEffect(() => {
        if (pathnameRef.current !== pathname) {
            dismiss();
            pathnameRef.current = pathname;
        }
    }, [pathname, dismiss]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            const el = containerRef.current;
            if (!el || el.contains(e.target as Node)) return;
            dismiss();
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => document.removeEventListener('pointerdown', onPointerDown, true);
    }, [open, dismiss]);

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
        if (open && !isLoading) {
            const t = setTimeout(() => inputRef.current?.focus(), 50);
            return () => clearTimeout(t);
        }
    }, [open, isLoading]);

    const persistAnchor = useCallback((value: Anchor) => {
        try {
            sessionStorage.setItem(POSITION_KEY, JSON.stringify(value));
        } catch {
            /* ignore */
        }
    }, []);

    const applyDragMove = useCallback(
        (clientX: number, clientY: number) => {
            const ds = dragState.current;
            if (!ds.active) return;

            const dx = clientX - ds.startX;
            const dy = clientY - ds.startY;
            const threshold = dragThreshold(ds.pointerType);
            if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                ds.moved = true;
            }

            const { width, height } = widgetSize(openRef.current, anchorRef.current);
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            let left = ds.originLeft + dx;
            let top = ds.originTop + dy;

            left = Math.max(EDGE, Math.min(vw - width - EDGE, left));
            top = Math.max(EDGE, Math.min(vh - height - EDGE, top));

            commitAnchor(
                rectToFabAnchor({ left, top, width, height }, openRef.current, ds.expand),
            );
        },
        [commitAnchor],
    );

    const endDragSession = useCallback(() => {
        const ds = dragState.current;
        if (!ds.active) return;
        ds.active = false;
        persistAnchor(anchorRef.current);
        ds.cleanup?.();
        ds.cleanup = null;
    }, [persistAnchor]);

    useEffect(() => {
        return () => dragState.current.cleanup?.();
    }, []);

    const onDragPointerDown = useCallback(
        (e: React.PointerEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-assistant-drag]')) return;
            if (e.button !== 0 && e.pointerType !== 'touch') return;

            dragState.current.cleanup?.();

            const current = anchorToRect(anchorRef.current, openRef.current);
            const { expand } = widgetSize(openRef.current, anchorRef.current);
            dragState.current = {
                active: true,
                pointerId: e.pointerId,
                pointerType: e.pointerType,
                startX: e.clientX,
                startY: e.clientY,
                originLeft: current.left,
                originTop: current.top,
                expand,
                moved: false,
                cleanup: null,
            };

            e.preventDefault();
            e.stopPropagation();

            const captureEl = containerRef.current ?? e.currentTarget;
            if (captureEl instanceof Element && 'setPointerCapture' in captureEl) {
                try {
                    (captureEl as HTMLElement).setPointerCapture(e.pointerId);
                } catch {
                    /* ignore */
                }
            }

            const prevTouchAction = document.body.style.touchAction;
            const prevOverflow = document.body.style.overflow;
            document.body.style.touchAction = 'none';
            document.body.style.overflow = 'hidden';

            const onMove = (ev: PointerEvent) => {
                if (!dragState.current.active || dragState.current.pointerId !== ev.pointerId) return;
                ev.preventDefault();
                applyDragMove(ev.clientX, ev.clientY);
            };

            const onEnd = (ev: PointerEvent) => {
                if (!dragState.current.active || dragState.current.pointerId !== ev.pointerId) return;
                ev.preventDefault();
                endDragSession();
                try {
                    (captureEl as HTMLElement).releasePointerCapture(ev.pointerId);
                } catch {
                    /* ignore */
                }
            };

            document.addEventListener('pointermove', onMove, { passive: false });
            document.addEventListener('pointerup', onEnd, { passive: false });
            document.addEventListener('pointercancel', onEnd, { passive: false });

            dragState.current.cleanup = () => {
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onEnd);
                document.removeEventListener('pointercancel', onEnd);
                document.body.style.touchAction = prevTouchAction;
                document.body.style.overflow = prevOverflow;
            };
        },
        [applyDragMove, endDragSession],
    );

    const onDragPointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!dragState.current.active || dragState.current.pointerId !== e.pointerId) return;
            e.preventDefault();
            applyDragMove(e.clientX, e.clientY);
        },
        [applyDragMove],
    );

    const endDrag = useCallback(
        (e: React.PointerEvent) => {
            if (!dragState.current.active || dragState.current.pointerId !== e.pointerId) return;
            e.preventDefault();
            endDragSession();
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
                /* ignore */
            }
        },
        [endDragSession],
    );

    const executeAction = useCallback(
        async (action: AssistantAction) => {
            if (action.type === 'navigate' && typeof action.path === 'string') {
                router.push(action.path);
                toast.success('Opening page…');
                return;
            }
            if (action.type === 'refresh_page') {
                toast.success('Refreshing…');
                await hardRefreshPage(router);
                return;
            }
            if (action.type === 'logout') {
                logout();
                toast.success('Signed out');
                return;
            }
            if (action.type === 'ui_action') {
                const target = action.ui_target || action.target;
                if (target === 'profile_logout') {
                    logout();
                    toast.success('Signed out');
                } else if (typeof target === 'string') {
                    dispatchUiAction(target as 'profile_menu' | 'open_settings' | 'profile_logout');
                    toast.success('Done');
                }
                return;
            }
            const result = await assistantApi.execute(action);
            if (result.type === 'navigate' && typeof result.path === 'string') {
                router.push(result.path);
                toast.success('Opening page…');
            } else if (result.type === 'toggle_ai') {
                toast.success(
                    result.ai_enabled ? 'AI enabled for conversation' : 'AI disabled — manual mode',
                );
                await reloadView(router);
            } else if (result.type === 'change_user_role') {
                const name = typeof result.name === 'string' ? result.name : 'User';
                const role = typeof result.role === 'string' ? result.role : '';
                toast.success(`${name} is now ${role}`);
                await reloadView(router);
            } else if (result.type === 'assign_lead') {
                const assignee = result.assigned_to ?? 'agent';
                const status =
                    typeof result.lead_status === 'string' ? result.lead_status : 'assigned';
                toast.success(`Lead assigned to ${assignee} · status: ${status}`);
                await reloadView(router);
            } else if (result.type === 'update_lead_status') {
                toast.success(`Status updated to ${result.lead_status ?? 'new status'}`);
                await reloadView(router);
            } else if (result.type === 'send_message') {
                toast.success('Message sent on WhatsApp');
                await reloadView(router);
            } else if (result.type === 'toggle_user_status') {
                const name = typeof result.name === 'string' ? result.name : 'User';
                toast.success(`${name} ${result.active ? 'enabled' : 'disabled'}`);
                await reloadView(router);
            } else if (result.type === 'verify_user') {
                const name = typeof result.name === 'string' ? result.name : 'User';
                toast.success(`${name} verified`);
                await reloadView(router);
            } else if (result.type === 'delete_user') {
                toast.success('User deleted');
                await reloadView(router);
            } else if (result.type === 'create_user') {
                toast.success(`User ${result.email ?? 'created'}`);
                await reloadView(router);
            } else if (result.type === 'reset_user_password') {
                const msg =
                    typeof result.message === 'string'
                        ? result.message
                        : 'Password reset. Check User Management for the temporary password.';
                toast.success(msg);
                await reloadView(router);
            } else if (result.type === 'update_user_profile') {
                toast.success(`Profile updated for ${result.name ?? 'user'}`);
                await reloadView(router);
            } else if (result.type === 'update_settings' || result.type === 'switch_ai_provider') {
                toast.success('Settings updated');
                await reloadView(router);
            } else if (result.type === 'get_analytics') {
                router.push('/dashboard');
                toast.success('Analytics loaded');
            } else if (result.type === 'create_task') {
                toast.success(`Task created: ${result.title ?? 'OK'}`);
                await reloadView(router);
            } else if (result.type === 'update_task') {
                toast.success('Task updated');
                await reloadView(router);
            } else if (result.type === 'delete_task') {
                toast.success('Task deleted');
                await reloadView(router);
            } else if (result.type === 'create_customer') {
                toast.success(`Customer ${result.name ?? 'created'}`);
                router.push(`/customers/${result.uuid}`);
            } else if (result.type === 'bulk_delete_users' || result.type === 'bulk_delete_customers') {
                const n = Array.isArray(result.deleted) ? result.deleted.length : 0;
                toast.success(`Deleted ${n} item(s)`);
                await reloadView(router);
            } else {
                toast.success('Done');
            }
        },
        [router, logout],
    );

    const runAction = useCallback(
        async (action: AssistantAction, index: number) => {
            const key = `${action.type}-${index}`;
            setExecutingAction(key);
            try {
                await executeAction(action);
            } catch (err) {
                toast.error(getErrorMessage(err));
            } finally {
                setExecutingAction(null);
            }
        },
        [executeAction],
    );

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const userMsg: AssistantChatMessage = { role: 'user', content: text };
        const historyForApi = messages
            .filter((m) => m !== WELCOME)
            .map(({ role, content }) => ({ role, content }));
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const { reply, actions } = await assistantApi.chat({
                message: text,
                history: historyForApi,
                pathname: pathname ?? undefined,
            });

            const responseActions = actions ?? [];
            const executedActions: AssistantAction[] = [];

            const chatHistory = [...messages.filter((m) => m !== WELCOME), userMsg];
            const autoActions = resolveClientActions(
                text,
                responseActions,
                pathname ?? undefined,
                chatHistory,
            );
            setExecutingAction('auto');
            try {
                for (const autoAction of autoActions) {
                    try {
                        await executeAction(autoAction);
                        executedActions.push(autoAction);
                        if (autoAction.type === 'navigate' && autoActions.length > 1) {
                            await new Promise((r) => setTimeout(r, 350));
                        }
                    } catch (err) {
                        toast.error(getErrorMessage(err));
                    }
                }
            } finally {
                setExecutingAction(null);
            }

            const visibleActions = responseActions.filter(
                (a) => !actionExecuted(executedActions, a),
            );

            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: reply,
                    actions: visibleActions.length > 0 ? visibleActions : undefined,
                    pendingActions: responseActions.length > 0 ? responseActions : undefined,
                },
            ]);
        } catch (err) {
            toast.error(getErrorMessage(err));
            setMessages((prev) => prev.slice(0, -1));
            setInput(text);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages, pathname, executeAction]);

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

    const suppressClickAfterDrag = (e: React.MouseEvent) => {
        if (dragState.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            dragState.current.moved = false;
        }
    };

    if (viewport.w === 0 || rect === null) return null;

    return (
        <div
            ref={containerRef}
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
                    onClickCapture={suppressClickAfterDrag}
                    className={cn(
                        'h-14 w-14 shrink-0 cursor-grab self-start rounded-full shadow-lg active:cursor-grabbing touch-none',
                        themeClasses.btnPrimary,
                        'text-white',
                    )}
                    style={{ width: FAB_SIZE, height: FAB_SIZE, WebkitTapHighlightColor: 'transparent' }}
                    aria-label={`Open ${ASSISTANT_NAME}`}
                    aria-expanded={false}
                    title="Drag to move · Tap to open"
                >
                    <MessageCircle className="h-6 w-6 pointer-events-none" />
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
                            className="flex min-w-0 flex-1 cursor-grab items-center gap-2 active:cursor-grabbing touch-none py-1 -my-1"
                            onPointerDown={onDragPointerDown}
                            title="Drag to move"
                        >
                            <GripVertical className="h-5 w-5 shrink-0 text-white/70 pointer-events-none" aria-hidden />
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
                                    {msg.actions && msg.actions.length > 0 && (
                                        <div className="mt-2 flex flex-col gap-1.5">
                                            {msg.actions.map((action, ai) => (
                                                <Button
                                                    key={`${action.type}-${ai}`}
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs justify-start bg-background"
                                                    disabled={executingAction !== null}
                                                    onClick={() => void runAction(action, ai)}
                                                >
                                                    {executingAction === `${action.type}-${ai}` ? (
                                                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                                    ) : null}
                                                    {action.label || action.type}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
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

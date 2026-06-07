/** Vivafy UI targets — open menus / trigger in-app controls without raw DOM clicks. */
export type UiActionTarget = 'profile_menu' | 'profile_logout' | 'open_settings';

export const VIVAFY_UI_EVENT = 'vivafy-ui';
export const VIVAFY_ASSISTANT_CLOSE_EVENT = 'vivafy-assistant-close';
export const VIVAFY_PAGE_READY_EVENT = 'vivafy-page-ready';

/** Mark loading shells so mobile nav can wait before closing. */
export const PAGE_LOADING_ATTR = 'data-page-loading';
/** Set on `<main>` while mobile nav is waiting for a route transition. */
export const NAV_PENDING_ATTR = 'data-nav-pending';

export function dispatchUiAction(target: UiActionTarget): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(VIVAFY_UI_EVENT, { detail: { target } }));
}

/** Collapse the floating assistant panel if it is open. */
export function closeAssistant(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(VIVAFY_ASSISTANT_CLOSE_EVENT));
}

/** Fired when the active route's main content has finished loading. */
export function signalPageReady(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(VIVAFY_PAGE_READY_EVENT));
}

export function parseUiTargetFromText(text: string): UiActionTarget | null {
  const t = text.toLowerCase();
  if (/\b(?:logout|sign\s*out|log\s*out)\b/.test(t) && /\b(?:profile|dropdown|menu|icon)\b/.test(t)) {
    return 'profile_logout';
  }
  if (/\b(?:profile|dropdown|menu)\b/.test(t) && /\b(?:open|click|show)\b/.test(t)) {
    return 'profile_menu';
  }
  if (/\b(?:settings?\s*(?:icon|button)?|gear)\b/.test(t) && /\b(?:open|click)\b/.test(t)) {
    return 'open_settings';
  }
  return null;
}

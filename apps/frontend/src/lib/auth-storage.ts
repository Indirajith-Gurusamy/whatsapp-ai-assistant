const AUTH_REDIRECT_KEY = 'auth_redirect';
const VERIFY_EMAIL_KEY = 'verify_email';
const FORGOT_PASSWORD_EMAIL_KEY = 'forgot_password_email';
export const RESET_EMAIL_KEY = 'reset_email';

function isBrowser(): boolean {
    return typeof window !== 'undefined';
}

/** Only allow same-origin relative paths (prevents open redirects). */
export function isSafeRedirect(path: string): boolean {
    if (!path.startsWith('/') || path.startsWith('//')) return false;
    if (path.includes('://')) return false;
    return true;
}

export function stripUrlQueryParams(): void {
    if (!isBrowser()) return;
    if (window.location.search) {
        window.history.replaceState({}, '', window.location.pathname);
    }
}

export function setAuthRedirect(path: string): void {
    if (!isBrowser() || !isSafeRedirect(path)) return;
    sessionStorage.setItem(AUTH_REDIRECT_KEY, path);
}

export function consumeAuthRedirect(): string | null {
    if (!isBrowser()) return null;
    const path = sessionStorage.getItem(AUTH_REDIRECT_KEY);
    sessionStorage.removeItem(AUTH_REDIRECT_KEY);
    return path && isSafeRedirect(path) ? path : null;
}

export function setVerifyEmail(email: string): void {
    if (!isBrowser()) return;
    sessionStorage.setItem(VERIFY_EMAIL_KEY, email);
}

export function getVerifyEmail(): string | null {
    if (!isBrowser()) return null;
    return sessionStorage.getItem(VERIFY_EMAIL_KEY);
}

export function clearVerifyEmail(): void {
    if (!isBrowser()) return;
    sessionStorage.removeItem(VERIFY_EMAIL_KEY);
}

export function setForgotPasswordEmail(email: string): void {
    if (!isBrowser()) return;
    sessionStorage.setItem(FORGOT_PASSWORD_EMAIL_KEY, email);
}

export function consumeForgotPasswordEmail(): string | null {
    if (!isBrowser()) return null;
    const email = sessionStorage.getItem(FORGOT_PASSWORD_EMAIL_KEY);
    sessionStorage.removeItem(FORGOT_PASSWORD_EMAIL_KEY);
    return email;
}

/** Migrate legacy ?redirect= and ?email= query params into sessionStorage, then clean the URL. */
export function migrateLegacyAuthQueryParams(): void {
    if (!isBrowser() || !window.location.search) return;

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    const email = params.get('email');

    if (redirect && isSafeRedirect(redirect)) {
        setAuthRedirect(redirect);
    }
    if (email) {
        const path = window.location.pathname;
        if (path.startsWith('/verify-email')) {
            setVerifyEmail(email);
        } else if (path.startsWith('/forgot-password')) {
            setForgotPasswordEmail(email);
        }
    }

    stripUrlQueryParams();
}

export function getDefaultPostLoginPath(role: string): string {
    return role === 'ADMIN' ? '/conversations' : '/dashboard';
}

const PUBLIC_AUTH_PATHS = [
    '/login',
    '/signup',
    '/verify-email',
    '/forgot-password',
    '/reset-password',
    '/admin/login',
    '/admin/signup',
];

export function isPublicAuthRoute(pathname: string | null | undefined): boolean {
    if (!pathname) return false;
    return PUBLIC_AUTH_PATHS.some((route) => pathname.startsWith(route));
}

export const SESSION_EXPIRED_EVENT = 'crm:session-expired';

/** Notify React auth state that tokens were cleared (e.g. 401). */
export function notifySessionExpired(): void {
    if (!isBrowser()) return;
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

/** Hard navigation to login — use after logout or 401. */
export function redirectToLogin(): void {
    if (!isBrowser()) return;
    if (window.location.pathname.startsWith('/login')) return;
    window.location.replace('/login');
}

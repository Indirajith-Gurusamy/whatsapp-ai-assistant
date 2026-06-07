'use client';

import { useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { NAV_PENDING_ATTR, PAGE_LOADING_ATTR, signalPageReady } from '@/lib/ui-actions';

function isMainContentReady(): boolean {
    if (typeof document === 'undefined') return false;
    const main = document.querySelector('main');
    if (!main) return true;
    if (main.hasAttribute(NAV_PENDING_ATTR)) return false;
    return !main.querySelector(`[${PAGE_LOADING_ATTR}]`);
}

/** Emits a page-ready event once route content is rendered (no loading shells in main). */
export function PageReadyWatcher() {
    const pathname = usePathname();

    const emitIfReady = useCallback(() => {
        if (isMainContentReady()) {
            signalPageReady();
        }
    }, []);

    useEffect(() => {
        const main = document.querySelector('main');
        if (!main) {
            emitIfReady();
            return;
        }

        const observer = new MutationObserver(() => emitIfReady());
        observer.observe(main, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [PAGE_LOADING_ATTR, NAV_PENDING_ATTR],
        });

        const raf = requestAnimationFrame(() => {
            requestAnimationFrame(emitIfReady);
        });

        return () => {
            observer.disconnect();
            cancelAnimationFrame(raf);
        };
    }, [pathname, emitIfReady]);

    return null;
}

export { isMainContentReady };

/** Page titles shown in the top bar (pathname → title). */
const PAGE_TITLES: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/conversations": "Leads",
    "/messages": "Messages",
    "/customers": "Customers",
    "/tasks": "Tasks",
    "/profile": "Profile",
    "/settings": "System Settings",
    "/settings/sessions": "Active Sessions",
    "/admin/users": "User Management",
};

const PREFIX_TITLES: [string, string][] = [
    ["/admin/users/", "Edit User"],
    ["/customers/", "Customer"],
];

export interface PageBreadcrumbConfig {
    href: string;
    label: string;
}

export function getPageBreadcrumb(
    pathname: string,
    from?: string | null,
): PageBreadcrumbConfig | null {
    if (from) {
        const fromPath = from.startsWith('/') ? from : `/${from}`;
        const fromLabel = PAGE_TITLES[fromPath];
        if (fromLabel) {
            return { href: fromPath, label: fromLabel };
        }
    }

    const normalized = pathname.split('?')[0].replace(/\/$/, '') || '/';
    if (normalized === '/') return null;

    const segments = normalized.split('/').filter(Boolean);
    if (segments.length <= 1) return null;

    // Walk up path segments and use the nearest parent with a known list/page title.
    for (let i = segments.length - 1; i >= 1; i--) {
        const parentPath = `/${segments.slice(0, i).join('/')}`;
        const label = PAGE_TITLES[parentPath];
        if (label) {
            return { href: parentPath, label };
        }
    }

    return null;
}

export function getPageTitle(pathname: string): string | null {
    if (PAGE_TITLES[pathname]) {
        return PAGE_TITLES[pathname];
    }
    for (const [prefix, title] of PREFIX_TITLES) {
        if (pathname.startsWith(prefix)) {
            return title;
        }
    }
    return null;
}

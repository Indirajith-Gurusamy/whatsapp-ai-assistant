import { mutate } from 'swr';

type AppRouter = { refresh: () => void };

/** Re-fetch all SWR-backed lists (conversations, customers, analytics, etc.). */
export async function revalidateAppCaches(): Promise<void> {
  await mutate(
    (key) => key !== null && key !== undefined,
    undefined,
    { revalidate: true },
  );
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vivafy-refresh'));
  }
}

/** Soft refresh: invalidate client caches + Next.js server components. */
export async function reloadView(router?: AppRouter): Promise<void> {
  await revalidateAppCaches();
  router?.refresh();
}

/** Hard refresh — matches browser reload so all data is current. */
export async function hardRefreshPage(router?: AppRouter): Promise<void> {
  await revalidateAppCaches();
  router?.refresh();
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

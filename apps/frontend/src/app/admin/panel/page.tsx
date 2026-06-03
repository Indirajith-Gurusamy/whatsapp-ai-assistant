import { redirect } from 'next/navigation';

/** Legacy route — user management replaced the admin panel. */
export default function AdminPanelPage() {
    redirect('/admin/users');
}

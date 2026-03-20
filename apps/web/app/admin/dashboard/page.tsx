import type { Metadata } from 'next';
import { AdminGuardedDashboard } from './AdminGuardedDashboard';

export const metadata: Metadata = {
  title: 'Panel de administración — MatchPaw',
  description: 'Verifica refugios y gestiona usuarios de la plataforma.',
};

export default function AdminDashboardPage() {
  return (
    <main>
      <AdminGuardedDashboard />
    </main>
  );
}

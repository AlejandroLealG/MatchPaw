import type { Metadata } from 'next';
import { DashboardClient } from './DashboardClient';

export const metadata: Metadata = {
  title: 'Panel del refugio — MatchPaw',
  description: 'Gestiona tus animales, solicitudes de adopción y perfil del refugio.',
};

export default function DashboardPage() {
  return (
    <main>
      <DashboardClient />
    </main>
  );
}

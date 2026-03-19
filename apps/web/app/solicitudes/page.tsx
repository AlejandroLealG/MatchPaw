import type { Metadata } from 'next';
import { MyRequestsView } from '../../components/features/requests/MyRequestsView';

export const metadata: Metadata = {
  title: 'Mis solicitudes — MatchPaw',
  description: 'Consulta el estado de tus solicitudes de adopción.',
};

export default function SolicitudesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-text-base dark:text-dark-text-base">
        Mis solicitudes
      </h1>
      <MyRequestsView />
    </main>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Spinner } from '../../components/ui/Spinner';
import { DonacionesClient } from './DonacionesClient';

export const metadata: Metadata = {
  title: 'Donaciones — MatchPaw',
  description: 'Apoya a los refugios de animales con una donación única o mensual.',
};

export default function DonacionesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-text-base dark:text-dark-text-base">
        Donaciones
      </h1>
      {/* Suspense requerido por useSearchParams en el Client Component */}
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        }
      >
        <DonacionesClient />
      </Suspense>
    </main>
  );
}

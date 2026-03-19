'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DonationForm } from '../../components/features/donations/DonationForm';
import { RecurringDonationManager } from '../../components/features/donations/RecurringDonationManager';
import { DonationHistory } from '../../components/features/donations/DonationHistory';
import { useDonationHistory } from '../../hooks/useDonations';
import { useAuthStore } from '../../store/authStore';

type Tab = 'unica' | 'mensual' | 'historial';

export function DonacionesClient() {
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();

  const refugioId = searchParams.get('refugioId') ?? '';
  const refugioNombre = searchParams.get('refugioNombre') ?? 'el refugio';

  const [tab, setTab] = useState<Tab>('unica');
  const [donationCount, setDonationCount] = useState(0);

  // Historial solo disponible para el refugio propietario (Req 6.4)
  const showHistorial = user?.role === 'refugio';
  const {
    donaciones,
    loading: histLoading,
    error: histError,
    refresh,
  } = useDonationHistory(showHistorial ? refugioId : '');

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="text-5xl" aria-hidden="true">
          🔒
        </span>
        <p className="text-base font-medium text-text-base dark:text-dark-text-base">
          Inicia sesión para realizar una donación
        </p>
      </div>
    );
  }

  if (!refugioId) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        No se especificó un refugio. Accede desde el perfil de un refugio para donar.
      </p>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'unica', label: 'Donación única' },
    { id: 'mensual', label: 'Donación mensual' },
    ...(showHistorial ? [{ id: 'historial' as Tab, label: 'Historial' }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Tipo de donación"
        className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={[
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              tab === t.id
                ? 'bg-surface text-text-base shadow-sm dark:bg-dark-surface dark:text-dark-text-base'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido del tab */}
      {tab === 'unica' && (
        <DonationForm
          refugioId={refugioId}
          refugioNombre={refugioNombre}
          onSuccess={() => {
            setDonationCount((n) => n + 1);
            refresh();
          }}
        />
      )}

      {tab === 'mensual' && (
        <RecurringDonationManager
          refugioId={refugioId}
          refugioNombre={refugioNombre}
          onCreated={() => refresh()}
          onCancelled={() => refresh()}
        />
      )}

      {tab === 'historial' && showHistorial && (
        <DonationHistory donaciones={donaciones} loading={histLoading} error={histError} />
      )}

      {/* Contador silencioso para forzar re-render tras donación exitosa */}
      <span className="sr-only" aria-live="polite">
        {donationCount > 0 ? `${donationCount} donación(es) realizadas` : ''}
      </span>
    </div>
  );
}

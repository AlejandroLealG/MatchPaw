'use client';

import React, { useState } from 'react';
import { Spinner } from '../../ui/Spinner';
import { RequestCard } from './RequestCard';
import { RequestDetailModal } from './RequestDetailModal';
import { useMyRequests, type SolicitudConAnimal } from '../../../hooks/useRequests';

export function MyRequestsView() {
  const { solicitudes, loading, error } = useMyRequests();
  const [selected, setSelected] = useState<SolicitudConAnimal | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Cargando solicitudes..." />
      </div>
    );
  }

  if (error) {
    return (
      <p
        role="alert"
        className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
      >
        {error}
      </p>
    );
  }

  if (solicitudes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="text-5xl" aria-hidden="true">
          🐾
        </span>
        <p className="text-base font-medium text-text-base dark:text-dark-text-base">
          Aún no tienes solicitudes
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Explora los animales disponibles y envía tu primera solicitud de adopción.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-4" aria-label="Mis solicitudes de adopción">
        {solicitudes.map((s) => (
          <li key={s._id}>
            <RequestCard solicitud={s} onViewDetail={setSelected} />
          </li>
        ))}
      </ul>

      <RequestDetailModal solicitud={selected} onClose={() => setSelected(null)} />
    </>
  );
}

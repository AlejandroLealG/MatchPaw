'use client';

import React from 'react';
import { Modal } from '../../ui/Modal';
import { Badge } from '../../ui/Badge';
import type { SolicitudConAnimal } from '../../../hooks/useRequests';

export interface RequestDetailModalProps {
  solicitud: SolicitudConAnimal | null;
  onClose: () => void;
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </span>
      <span className="text-sm text-text-base dark:text-dark-text-base">{value}</span>
    </div>
  );
}

const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente de revisión',
  aprobada: 'Solicitud aprobada',
  rechazada: 'Solicitud rechazada',
};

export function RequestDetailModal({ solicitud, onClose }: RequestDetailModalProps) {
  if (!solicitud) return null;

  const fechaEnvio = new Date(solicitud.createdAt).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Modal
      open={!!solicitud}
      onClose={onClose}
      title={`Solicitud — ${solicitud.animal?.nombre ?? 'Animal'}`}
      size="md"
    >
      <div className="flex flex-col gap-5">
        {/* Estado */}
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800">
          <Badge variant={solicitud.estado} />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {estadoLabel[solicitud.estado]}
          </span>
        </div>

        {/* Datos del animal */}
        {solicitud.animal && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Animal
            </span>
            <p className="text-sm font-semibold text-text-base dark:text-dark-text-base">
              {solicitud.animal.nombre}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {solicitud.animal.especie} · {solicitud.animal.raza}
            </p>
          </div>
        )}

        {/* Información del adoptante */}
        <div className="flex flex-col gap-3">
          <DetailRow label="Descripción del hogar" value={solicitud.descripcionHogar} />
          <DetailRow label="Experiencia con mascotas" value={solicitud.experienciaMascotas} />
          <DetailRow label="Fecha de envío" value={fechaEnvio} />
          {solicitud.motivoRefugio && (
            <DetailRow label="Respuesta del refugio" value={solicitud.motivoRefugio} />
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-primary hover:underline dark:text-dark-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}

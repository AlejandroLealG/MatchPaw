import React from 'react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import type { SolicitudConAnimal } from '../../../hooks/useRequests';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function resolveImageUrl(url: string): string {
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
}

export interface RequestCardProps {
  solicitud: SolicitudConAnimal;
  onViewDetail?: (solicitud: SolicitudConAnimal) => void;
}

export function RequestCard({ solicitud, onViewDetail }: RequestCardProps) {
  const foto = solicitud.animal?.fotos?.find((f) => f.orden === 0) ?? solicitud.animal?.fotos?.[0];
  const fecha = new Date(solicitud.createdAt).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Foto del animal */}
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
          {foto ? (
            <img
              src={resolveImageUrl(foto.url)}
              alt={solicitud.animal?.nombre ?? 'Animal'}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-text-base dark:text-dark-text-base truncate">
              {solicitud.animal?.nombre ?? 'Animal'}
            </p>
            <Badge variant={solicitud.estado} />
          </div>
          {solicitud.animal && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {solicitud.animal.especie} · {solicitud.animal.raza}
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500">Enviada el {fecha}</p>
        </div>
      </div>

      {onViewDetail && (
        <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-700">
          <button
            type="button"
            onClick={() => onViewDetail(solicitud)}
            className="text-sm text-primary hover:underline dark:text-dark-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Ver detalle
          </button>
        </div>
      )}
    </Card>
  );
}

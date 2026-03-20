'use client';

import React from 'react';
import { Spinner } from '../../ui/Spinner';
import type { Notificacion } from '../../../store/notificationStore';

const tipoIcono: Record<Notificacion['tipo'], string> = {
  nueva_solicitud: '📋',
  cambio_estado_solicitud: '🔔',
  donacion_recibida: '💚',
  animal_adoptado: '🐾',
};

interface NotificationDropdownProps {
  notificaciones: Notificacion[];
  loading: boolean;
  onMarcarLeida: (id: string) => void;
  onClose: () => void;
}

export function NotificationDropdown({
  notificaciones,
  loading,
  onMarcarLeida,
  onClose,
}: NotificationDropdownProps) {
  return (
    <div
      role="dialog"
      aria-label="Notificaciones"
      className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
      {/* Encabezado */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificaciones</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar notificaciones"
          className="rounded p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:text-gray-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Lista */}
      <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
        {loading && (
          <li className="flex justify-center py-8">
            <Spinner size="sm" label="Cargando notificaciones..." />
          </li>
        )}

        {!loading && notificaciones.length === 0 && (
          <li className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No tienes notificaciones
          </li>
        )}

        {!loading &&
          notificaciones.map((n) => (
            <li
              key={n.id}
              className={[
                'flex gap-3 px-4 py-3 transition-colors',
                n.leida ? 'bg-white dark:bg-gray-900' : 'bg-blue-50 dark:bg-blue-950/30',
              ].join(' ')}
            >
              <span className="mt-0.5 shrink-0 text-lg" aria-hidden="true">
                {tipoIcono[n.tipo]}
              </span>
              <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {n.titulo}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.cuerpo}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(n.createdAt).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              {!n.leida && (
                <button
                  type="button"
                  onClick={() => onMarcarLeida(n.id)}
                  aria-label="Marcar como leída"
                  className="shrink-0 self-start rounded p-1 text-xs text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-blue-400"
                >
                  Leída
                </button>
              )}
            </li>
          ))}
      </ul>
    </div>
  );
}

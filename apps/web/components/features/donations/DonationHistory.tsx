import React from 'react';
import { Card } from '../../ui/Card';
import { Spinner } from '../../ui/Spinner';
import { Badge } from '../../ui/Badge';
import type { IDonacion, DonacionEstado } from '@matchpaw/shared';

export interface DonationHistoryProps {
  donaciones: IDonacion[];
  loading: boolean;
  error: string | null;
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

const estadoBadgeVariant: Record<DonacionEstado, 'aprobada' | 'rechazada' | 'pendiente'> = {
  completada: 'aprobada',
  fallida: 'rechazada',
  pendiente: 'pendiente',
};

const estadoLabel: Record<DonacionEstado, string> = {
  completada: 'Completada',
  fallida: 'Fallida',
  pendiente: 'Pendiente',
};

export function DonationHistory({ donaciones, loading, error }: DonationHistoryProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" label="Cargando historial..." />
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

  if (donaciones.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Aún no hay donaciones registradas.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3" aria-label="Historial de donaciones">
      {donaciones.map((d) => {
        const fecha = new Date(d.createdAt).toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        return (
          <li key={d._id}>
            <Card padding="sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-text-base dark:text-dark-text-base">
                    {formatCOP(d.monto)}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{fecha}</span>
                  {d.numeroReferencia && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      Ref: {d.numeroReferencia}
                    </span>
                  )}
                </div>
                <Badge variant={estadoBadgeVariant[d.estado]}>{estadoLabel[d.estado]}</Badge>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

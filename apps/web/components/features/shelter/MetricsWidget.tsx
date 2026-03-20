import React from 'react';
import { Card } from '../../ui/Card';
import { Spinner } from '../../ui/Spinner';
import type { RefugioMetricas } from '../../../hooks/useShelterDashboard';

export interface MetricsWidgetProps {
  metricas: RefugioMetricas | null;
  loading: boolean;
  error: string | null;
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: string;
  colorClass: string;
}

function MetricCard({ label, value, icon, colorClass }: MetricCardProps) {
  return (
    <Card padding="md" className="flex items-center gap-4">
      <span
        className={[
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl',
          colorClass,
        ].join(' ')}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div>
        <p className="text-2xl font-bold text-text-base dark:text-dark-text-base">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </Card>
  );
}

/** Muestra las métricas resumidas del refugio (Requisito 7.1) */
export function MetricsWidget({ metricas, loading, error }: MetricsWidgetProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner label="Cargando métricas..." />
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    );
  }

  if (!metricas) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Animales publicados"
        value={metricas.totalAnimales}
        icon="🐾"
        colorClass="bg-blue-100 dark:bg-blue-900/30"
      />
      <MetricCard
        label="Solicitudes pendientes"
        value={metricas.solicitudesPendientes}
        icon="📋"
        colorClass="bg-amber-100 dark:bg-amber-900/30"
      />
      <MetricCard
        label="Solicitudes aprobadas"
        value={metricas.solicitudesAprobadas}
        icon="✅"
        colorClass="bg-emerald-100 dark:bg-emerald-900/30"
      />
      <MetricCard
        label="Donaciones este mes"
        value={metricas.donacionesMes}
        icon="💚"
        colorClass="bg-purple-100 dark:bg-purple-900/30"
      />
    </div>
  );
}

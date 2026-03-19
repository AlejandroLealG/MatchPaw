import React from 'react';

// Estados de animal
export type AnimalEstado = 'disponible' | 'en_proceso' | 'adoptado';
// Estados de solicitud
export type SolicitudEstado = 'pendiente' | 'aprobada' | 'rechazada';

export type BadgeVariant = AnimalEstado | SolicitudEstado | 'default';

export interface BadgeProps {
  variant?: BadgeVariant;
  children?: React.ReactNode;
  /** Si no se pasan children, se muestra la etiqueta predeterminada del variant */
  label?: string;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  // Animal
  disponible: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  en_proceso: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  adoptado: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  // Solicitud
  pendiente: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  aprobada: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  rechazada: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  // Genérico
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const defaultLabels: Partial<Record<BadgeVariant, string>> = {
  disponible: 'Disponible',
  en_proceso: 'En proceso',
  adoptado: 'Adoptado',
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

export function Badge({ variant = 'default', children, label, className = '' }: BadgeProps) {
  const content = children ?? label ?? defaultLabels[variant] ?? variant;

  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {content}
    </span>
  );
}

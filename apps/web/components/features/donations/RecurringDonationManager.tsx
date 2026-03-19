'use client';

import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { useRecurringDonations } from '../../../hooks/useDonations';
import type { ISuscripcionDonacion } from '@matchpaw/shared';

export interface RecurringDonationManagerProps {
  refugioId: string;
  refugioNombre: string;
  /** Suscripción activa existente, si la hay */
  suscripcionActiva?: ISuscripcionDonacion | null;
  onCreated?: (s: ISuscripcionDonacion) => void;
  onCancelled?: () => void;
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function RecurringDonationManager({
  refugioId,
  refugioNombre,
  suscripcionActiva,
  onCreated,
  onCancelled,
}: RecurringDonationManagerProps) {
  const { createSuscripcion, cancelarSuscripcion, loading, error, clearError } =
    useRecurringDonations();
  const [monto, setMonto] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const montoNum = parseInt(monto.replace(/\D/g, ''), 10);
  const isValid = !isNaN(montoNum) && montoNum >= 1000;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    try {
      const s = await createSuscripcion({ refugioId, montoMensual: montoNum });
      setMonto('');
      onCreated?.(s);
    } catch {
      // error en el hook
    }
  };

  const handleCancel = async () => {
    if (!suscripcionActiva) return;
    try {
      await cancelarSuscripcion(suscripcionActiva._id);
      setConfirmCancel(false);
      onCancelled?.();
    } catch {
      // error en el hook
    }
  };

  // Vista: suscripción activa existente
  if (suscripcionActiva && suscripcionActiva.estado === 'activa') {
    return (
      <Card padding="md">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-base dark:text-dark-text-base">
                Donación mensual activa
              </p>
              <p className="text-lg font-bold text-primary dark:text-dark-primary">
                {formatCOP(suscripcionActiva.montoMensual)} / mes
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">a {refugioNombre}</p>
            </div>
            <Badge variant="aprobada">Activa</Badge>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {confirmCancel ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                ¿Confirmas que deseas cancelar tu donación mensual?
              </p>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" loading={loading} onClick={handleCancel}>
                  Sí, cancelar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={() => {
                    setConfirmCancel(false);
                    clearError();
                  }}
                >
                  No, mantener
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(true)}>
              Cancelar suscripción
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Vista: formulario para crear suscripción
  return (
    <Card padding="md">
      <form onSubmit={handleCreate} noValidate className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-text-base dark:text-dark-text-base">
            Donación mensual a {refugioNombre}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Configura un monto fijo que se donará automáticamente cada mes. Puedes cancelar en
            cualquier momento.
          </p>
        </div>

        <Input
          label="Monto mensual (COP)"
          type="text"
          inputMode="numeric"
          value={monto}
          onChange={(e) => {
            setMonto(e.target.value.replace(/\D/g, ''));
            clearError();
          }}
          placeholder="Ej: 20000"
          helperText="Monto mínimo: $1.000 COP"
        />

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} disabled={!isValid}>
          {isValid ? `Activar ${formatCOP(montoNum)} / mes` : 'Activar donación mensual'}
        </Button>
      </form>
    </Card>
  );
}

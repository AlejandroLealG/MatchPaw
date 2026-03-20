'use client';

import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { useCreateDonation } from '../../../hooks/useDonations';

export interface DonationFormProps {
  refugioId: string;
  refugioNombre: string;
  onSuccess?: () => void;
}

/** Montos rápidos predefinidos en COP */
const MONTOS_RAPIDOS = [10000, 20000, 50000, 100000];

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function DonationForm({ refugioId, refugioNombre, onSuccess }: DonationFormProps) {
  const { createDonation, loading, error, clearError } = useCreateDonation();
  const [monto, setMonto] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const montoNum = parseInt(monto.replace(/\D/g, ''), 10);
  const isValid = !isNaN(montoNum) && montoNum >= 1000;

  const handleMontoRapido = (valor: number) => {
    setMonto(String(valor));
    clearError();
  };

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo dígitos — COP sin decimales (Req 6.1)
    const raw = e.target.value.replace(/\D/g, '');
    setMonto(raw);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    try {
      await createDonation({ refugioId, monto: montoNum });
      setSubmitted(true);
      onSuccess?.();
    } catch {
      // error ya está en el hook
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="text-5xl" aria-hidden="true">
          💚
        </span>
        <p className="text-base font-semibold text-text-base dark:text-dark-text-base">
          ¡Gracias por tu donación!
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Recibirás un comprobante en tu correo electrónico.
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            setSubmitted(false);
            setMonto('');
          }}
        >
          Hacer otra donación
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Layout: 1 columna en móvil → 2 columnas en md (Req diseño) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Columna izquierda */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1 text-sm font-medium text-text-base dark:text-dark-text-base">
              Donando a
            </p>
            <p className="text-base font-semibold text-primary dark:text-dark-primary">
              {refugioNombre}
            </p>
          </div>

          {/* Montos rápidos */}
          <div>
            <p className="mb-2 text-sm font-medium text-text-base dark:text-dark-text-base">
              Monto rápido
            </p>
            <div className="grid grid-cols-2 gap-2">
              {MONTOS_RAPIDOS.map((valor) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => handleMontoRapido(valor)}
                  className={[
                    'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    montoNum === valor
                      ? 'border-primary bg-primary text-white dark:border-dark-primary dark:bg-dark-primary dark:text-gray-900'
                      : 'border-gray-300 bg-surface text-text-base hover:bg-gray-50 dark:border-gray-600 dark:bg-dark-surface dark:text-dark-text-base dark:hover:bg-gray-700',
                  ].join(' ')}
                >
                  {formatCOP(valor)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="flex flex-col gap-4">
          <Input
            label="Otro monto (COP)"
            type="text"
            inputMode="numeric"
            value={monto}
            onChange={handleMontoChange}
            placeholder="Ej: 30000"
            helperText="Monto mínimo: $1.000 COP"
          />

          {/* Req 6.3: error genérico sin detalles sensibles */}
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth loading={loading} disabled={!isValid}>
            {isValid ? `Donar ${formatCOP(montoNum)}` : 'Donar'}
          </Button>

          <p className="text-xs text-center text-gray-400 dark:text-gray-500">
            Pago seguro procesado por Stripe
          </p>
        </div>
      </div>
    </form>
  );
}

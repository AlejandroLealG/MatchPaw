'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  IDonacion,
  ISuscripcionDonacion,
  CreateDonacionDto,
  CreateSuscripcionDto,
} from '@matchpaw/shared';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function authHeaders(token: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Respuesta del endpoint POST /donaciones — incluye el clientSecret de Stripe */
export interface DonacionIntentResponse {
  clientSecret: string;
  donacionId: string;
}

/**
 * Hook para iniciar un pago único (Requisitos 6.1, 6.3).
 * El backend crea el PaymentIntent en Stripe y devuelve el clientSecret.
 */
export function useCreateDonation() {
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDonation = useCallback(
    async (payload: CreateDonacionDto): Promise<DonacionIntentResponse> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/donaciones`, {
          method: 'POST',
          headers: authHeaders(token),
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          // Req 6.3: no revelar detalles sensibles del error de pago
          throw new Error('No se pudo procesar el pago. Por favor intenta de nuevo.');
        }
        return res.json();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'No se pudo procesar el pago. Por favor intenta de nuevo.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  return { createDonation, loading, error, clearError: () => setError(null) };
}

/** Hook para el historial de donaciones de un refugio (Requisito 6.4) */
export function useDonationHistory(refugioId: string) {
  const token = useAuthStore((s) => s.token);
  const [donaciones, setDonaciones] = useState<IDonacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!token || !refugioId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/refugios/${refugioId}/donaciones`, {
        headers: authHeaders(token),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al cargar el historial de donaciones');
      const data: IDonacion[] = await res.json();
      setDonaciones(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el historial de donaciones');
    } finally {
      setLoading(false);
    }
  }, [token, refugioId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { donaciones, loading, error, refresh: fetchHistory };
}

/** Hook para gestionar suscripciones recurrentes (Requisito 6.5) */
export function useRecurringDonations() {
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSuscripcion = useCallback(
    async (payload: CreateSuscripcionDto): Promise<ISuscripcionDonacion> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/donaciones/recurrentes`, {
          method: 'POST',
          headers: authHeaders(token),
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error('No se pudo configurar la donación recurrente. Intenta de nuevo.');
        }
        return res.json();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'No se pudo configurar la donación recurrente. Intenta de nuevo.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  const cancelarSuscripcion = useCallback(
    async (id: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/donaciones/recurrentes/${id}`, {
          method: 'DELETE',
          headers: authHeaders(token),
          credentials: 'include',
        });
        if (!res.ok) {
          throw new Error('No se pudo cancelar la suscripción. Intenta de nuevo.');
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'No se pudo cancelar la suscripción. Intenta de nuevo.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  return {
    createSuscripcion,
    cancelarSuscripcion,
    loading,
    error,
    clearError: () => setError(null),
  };
}

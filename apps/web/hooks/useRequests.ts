'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ISolicitud, CreateSolicitudDto, UpdateSolicitudEstadoDto } from '@matchpaw/shared';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Solicitud enriquecida con datos del animal para el historial del adoptante */
export interface SolicitudConAnimal extends ISolicitud {
  animal?: {
    _id: string;
    nombre: string;
    especie: string;
    raza: string;
    fotos: { url: string; orden: number }[];
  };
}

function authHeaders(token: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Hook para enviar una solicitud de adopción (Requisitos 5.1, 5.2, 5.6) */
export function useSendRequest() {
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendRequest = useCallback(
    async (payload: CreateSolicitudDto): Promise<ISolicitud> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/solicitudes`, {
          method: 'POST',
          headers: authHeaders(token),
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          // Req 5.6: error informativo si ya existe solicitud activa
          throw new Error(data?.error?.message ?? 'Error al enviar la solicitud');
        }
        return res.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al enviar la solicitud';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  return { sendRequest, loading, error, clearError: () => setError(null) };
}

/** Hook para el historial de solicitudes del adoptante (Requisito 5.4) */
export function useMyRequests() {
  const token = useAuthStore((s) => s.token);
  const [solicitudes, setSolicitudes] = useState<SolicitudConAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMySolicitudes = useCallback(async () => {
    if (!token) {
      setSolicitudes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/solicitudes/mis-solicitudes`, {
        headers: authHeaders(token),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al cargar tus solicitudes');
      const data: SolicitudConAnimal[] = await res.json();
      setSolicitudes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar tus solicitudes');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMySolicitudes();
  }, [fetchMySolicitudes]);

  return { solicitudes, loading, error, refresh: fetchMySolicitudes };
}

/** Hook para cambiar el estado de una solicitud — uso del refugio (Requisito 5.3) */
export function useUpdateRequestStatus() {
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateEstado = useCallback(
    async (id: string, payload: UpdateSolicitudEstadoDto): Promise<ISolicitud> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/solicitudes/${id}`, {
          method: 'PATCH',
          headers: authHeaders(token),
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error?.message ?? 'Error al actualizar la solicitud');
        }
        return res.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar la solicitud';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  return { updateEstado, loading, error };
}

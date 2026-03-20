'use client';

import { useState, useCallback, useEffect } from 'react';
import type { IAnimal, IRefugio, CreateAnimalDto, UpdateAnimalDto } from '@matchpaw/shared';
import type { SolicitudConAnimal } from './useRequests';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function authHeaders(token: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface RefugioMetricas {
  totalAnimales: number;
  solicitudesPendientes: number;
  solicitudesAprobadas: number;
  donacionesMes: number;
}

/** Hook para métricas del panel del refugio (Requisito 7.1) */
export function useShelterMetrics(refugioId: string) {
  const token = useAuthStore((s) => s.token);
  const [metricas, setMetricas] = useState<RefugioMetricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetricas = useCallback(async () => {
    if (!token || !refugioId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/refugios/${refugioId}/metricas`, {
        headers: authHeaders(token),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al cargar las métricas');
      const data: RefugioMetricas = await res.json();
      setMetricas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las métricas');
    } finally {
      setLoading(false);
    }
  }, [token, refugioId]);

  useEffect(() => {
    fetchMetricas();
  }, [fetchMetricas]);

  return { metricas, loading, error, refresh: fetchMetricas };
}

/** Hook para solicitudes pendientes del refugio (Requisito 7.2) */
export function useShelterRequests() {
  const token = useAuthStore((s) => s.token);
  const [solicitudes, setSolicitudes] = useState<SolicitudConAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSolicitudes = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/solicitudes/refugio`, {
        headers: authHeaders(token),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al cargar las solicitudes');
      const json = await res.json();
      const data: SolicitudConAnimal[] = Array.isArray(json) ? json : (json.data ?? []);
      // Req 7.2: ordenadas de más reciente a más antigua
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setSolicitudes(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  return { solicitudes, loading, error, refresh: fetchSolicitudes };
}

/** Hook para gestión de animales del refugio (Requisitos 2.2–2.4, 7.3) */
export function useShelterAnimals(refugioId: string) {
  const token = useAuthStore((s) => s.token);
  const [animales, setAnimales] = useState<IAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnimales = useCallback(async () => {
    if (!refugioId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/refugios/${refugioId}/animales`, {
        headers: authHeaders(token),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al cargar los animales');
      const json = await res.json();
      // El endpoint puede devolver array directo o { data: [] } paginado
      const data: IAnimal[] = Array.isArray(json) ? json : (json.data ?? []);
      setAnimales(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los animales');
    } finally {
      setLoading(false);
    }
  }, [token, refugioId]);

  useEffect(() => {
    fetchAnimales();
  }, [fetchAnimales]);

  const createAnimal = useCallback(
    async (payload: CreateAnimalDto): Promise<IAnimal> => {
      const res = await fetch(`${API_URL}/animales`, {
        method: 'POST',
        headers: authHeaders(token),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? 'Error al publicar el animal');
      }
      const created: IAnimal = await res.json();
      setAnimales((prev) => [created, ...prev]);
      return created;
    },
    [token],
  );

  const updateAnimal = useCallback(
    async (id: string, payload: UpdateAnimalDto): Promise<IAnimal> => {
      const res = await fetch(`${API_URL}/animales/${id}`, {
        method: 'PUT',
        headers: authHeaders(token),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? 'Error al actualizar el animal');
      }
      const updated: IAnimal = await res.json();
      setAnimales((prev) => prev.map((a) => (a._id === id ? updated : a)));
      return updated;
    },
    [token],
  );

  /** Req 7.3: cambio rápido de estado desde el panel */
  const updateEstado = useCallback(
    async (id: string, estado: IAnimal['estado']): Promise<IAnimal> => {
      const res = await fetch(`${API_URL}/animales/${id}/estado`, {
        method: 'PATCH',
        headers: authHeaders(token),
        credentials: 'include',
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? 'Error al cambiar el estado');
      }
      const updated: IAnimal = await res.json();
      setAnimales((prev) => prev.map((a) => (a._id === id ? updated : a)));
      return updated;
    },
    [token],
  );

  return {
    animales,
    loading,
    error,
    refresh: fetchAnimales,
    createAnimal,
    updateAnimal,
    updateEstado,
  };
}

/** Hook para el perfil del refugio (Requisito 2.1) */
export function useShelterProfile(refugioId: string) {
  const token = useAuthStore((s) => s.token);
  const [refugio, setRefugio] = useState<IRefugio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRefugio = useCallback(async () => {
    if (!refugioId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/refugios/${refugioId}`, {
        headers: authHeaders(token),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al cargar el perfil del refugio');
      const data: IRefugio = await res.json();
      setRefugio(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el perfil del refugio');
    } finally {
      setLoading(false);
    }
  }, [token, refugioId]);

  useEffect(() => {
    fetchRefugio();
  }, [fetchRefugio]);

  const updateRefugio = useCallback(
    async (payload: Partial<IRefugio>): Promise<IRefugio> => {
      const res = await fetch(`${API_URL}/refugios/${refugioId}`, {
        method: 'PUT',
        headers: authHeaders(token),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? 'Error al actualizar el perfil');
      }
      const updated: IRefugio = await res.json();
      setRefugio(updated);
      return updated;
    },
    [token, refugioId],
  );

  return { refugio, loading, error, refresh: fetchRefugio, updateRefugio };
}

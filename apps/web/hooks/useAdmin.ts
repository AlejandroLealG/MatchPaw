'use client';

import { useState, useCallback, useEffect } from 'react';
import type { IRefugio, IUser } from '@matchpaw/shared';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function authHeaders(token: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface IDonacionAdmin {
  _id: string;
  refugioId: string;
  adoptanteId: string;
  monto: number;
  estado: string;
  referencia: string;
  createdAt: Date;
}

/** Hook para gestión de refugios desde el panel admin */
export function useAdminRefugios(estado?: string) {
  const token = useAuthStore((s) => s.token);
  const [refugios, setRefugios] = useState<IRefugio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRefugios = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = estado
        ? `${API_URL}/admin/refugios?estado=${encodeURIComponent(estado)}`
        : `${API_URL}/admin/refugios`;
      const res = await fetch(url, {
        headers: authHeaders(token),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al cargar los refugios');
      const data: IRefugio[] = await res.json();
      setRefugios(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los refugios');
    } finally {
      setLoading(false);
    }
  }, [token, estado]);

  useEffect(() => {
    fetchRefugios();
  }, [fetchRefugios]);

  const verificarRefugio = useCallback(
    async (id: string, accion: 'aprobar' | 'rechazar', motivo?: string): Promise<void> => {
      const res = await fetch(`${API_URL}/admin/refugios/${id}/verificar`, {
        method: 'PATCH',
        headers: authHeaders(token),
        credentials: 'include',
        body: JSON.stringify({ accion, ...(motivo ? { motivo } : {}) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? 'Error al verificar el refugio');
      }
      await fetchRefugios();
    },
    [token, fetchRefugios],
  );

  return { refugios, loading, error, refresh: fetchRefugios, verificarRefugio };
}

/** Hook para gestión de usuarios desde el panel admin */
export function useAdminUsuarios() {
  const token = useAuthStore((s) => s.token);
  const [usuarios, setUsuarios] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsuarios = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/usuarios`, {
        headers: authHeaders(token),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al cargar los usuarios');
      const data: IUser[] = await res.json();
      setUsuarios(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const toggleActivo = useCallback(
    async (id: string, activo: boolean): Promise<void> => {
      const res = await fetch(`${API_URL}/admin/usuarios/${id}/estado`, {
        method: 'PATCH',
        headers: authHeaders(token),
        credentials: 'include',
        body: JSON.stringify({ activo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? 'Error al actualizar el usuario');
      }
      setUsuarios((prev) => prev.map((u) => (u._id === id ? { ...u, activo } : u)));
    },
    [token],
  );

  return { usuarios, loading, error, refresh: fetchUsuarios, toggleActivo };
}

/** Hook para donaciones desde el panel admin */
export function useAdminDonaciones() {
  const token = useAuthStore((s) => s.token);
  const [donaciones, setDonaciones] = useState<IDonacionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDonaciones = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/donaciones`, {
        headers: authHeaders(token),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al cargar las donaciones');
      const data: IDonacionAdmin[] = await res.json();
      setDonaciones(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las donaciones');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDonaciones();
  }, [fetchDonaciones]);

  return { donaciones, loading, error, refresh: fetchDonaciones };
}

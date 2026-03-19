'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { ShelterDashboard } from '../../../components/features/shelter/ShelterDashboard';
import { Spinner } from '../../../components/ui/Spinner';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Resuelve el refugioId del usuario autenticado consultando la API.
 * El backend devuelve el perfil del refugio asociado al userId del JWT.
 */
async function fetchRefugioId(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/refugios/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data._id ?? null;
  } catch {
    return null;
  }
}

export function DashboardClient() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const [refugioId, setRefugioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || user?.role !== 'refugio') {
      setLoading(false);
      return;
    }
    fetchRefugioId(token).then((id) => {
      setRefugioId(id);
      setLoading(false);
    });
  }, [token, user]);

  // Guardia de rol
  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <span className="text-5xl" aria-hidden="true">
          🔒
        </span>
        <p className="text-base font-medium text-text-base dark:text-dark-text-base">
          Inicia sesión para acceder al panel del refugio.
        </p>
      </div>
    );
  }

  if (user.role !== 'refugio') {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <span className="text-5xl" aria-hidden="true">
          🚫
        </span>
        <p className="text-base font-medium text-text-base dark:text-dark-text-base">
          Esta sección es exclusiva para refugios.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" label="Cargando panel..." />
      </div>
    );
  }

  if (!refugioId) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <span className="text-5xl" aria-hidden="true">
          ⚠️
        </span>
        <p className="text-base font-medium text-text-base dark:text-dark-text-base">
          No se encontró el perfil del refugio. Contacta al administrador.
        </p>
      </div>
    );
  }

  return <ShelterDashboard refugioId={refugioId} />;
}

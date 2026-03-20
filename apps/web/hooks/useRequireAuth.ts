'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

/**
 * Redirige al login si el usuario no está autenticado.
 * Espera a que Zustand rehidrate desde localStorage antes de decidir.
 */
export function useRequireAuth(allowedRoles?: string[]) {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s._hydrated);
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return; // esperar rehidratación
    if (!user) {
      router.replace('/login');
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace('/animales');
    }
  }, [hydrated, user, router, allowedRoles]);

  return { user, hydrated };
}

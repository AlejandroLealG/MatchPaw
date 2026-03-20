'use client';

import React, { useEffect, useRef } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function decodeJwt(token: string): { exp?: number; sub: string; email: string; role: string } {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return { sub: '', email: '', role: '' };
  }
}

function isExpired(token: string): boolean {
  const { exp } = decodeJwt(token);
  if (!exp) return true;
  return Date.now() >= exp * 1000 - 30_000; // 30s de margen
}

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const { token, setAuth, clearAuth } = useAuthStore();
  const refreshed = useRef(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (refreshed.current) return;
    refreshed.current = true;

    if (token) {
      if (isExpired(token)) {
        // Token expirado — intentar refresh con la cookie httpOnly
        fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.accessToken) {
              const payload = decodeJwt(data.accessToken);
              setAuth(
                { id: payload.sub, email: payload.email, role: payload.role as never },
                data.accessToken,
              );
              document.cookie = `access_token=${data.accessToken}; path=/; max-age=900; SameSite=Lax`;
            } else {
              clearAuth();
              document.cookie = 'access_token=; path=/; max-age=0; SameSite=Lax';
            }
          })
          .catch(() => {
            clearAuth();
            document.cookie = 'access_token=; path=/; max-age=0; SameSite=Lax';
          });
      } else {
        // Token válido — asegurar que la cookie esté presente para el middleware
        document.cookie = `access_token=${token}; path=/; max-age=900; SameSite=Lax`;
      }
    }
  }, [token, setAuth, clearAuth]);

  return <>{children}</>;
}

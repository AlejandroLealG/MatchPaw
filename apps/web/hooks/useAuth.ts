'use client';

import { useState, useCallback } from 'react';
import { useAuthStore, UserRole } from '../store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface RegisterPayload {
  email: string;
  password: string;
  role: UserRole;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

function decodeJwt(token: string): JwtPayload {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload)) as JwtPayload;
}

export function useAuth() {
  const { user, token, setAuth, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(
    async (payload: RegisterPayload) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error?.message ?? 'Error al registrarse');
        }
        const data: AuthResponse = await res.json();
        const jwtPayload = decodeJwt(data.accessToken);
        const user = { id: jwtPayload.sub, email: jwtPayload.email, role: jwtPayload.role };
        setAuth(user, data.accessToken);
        // Guardar en cookie para que el middleware de Next.js pueda leerlo
        document.cookie = `access_token=${data.accessToken}; path=/; max-age=900; SameSite=Lax`;
        return { user, accessToken: data.accessToken };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al registrarse';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setAuth],
  );

  const login = useCallback(
    async (payload: LoginPayload) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          // Mensaje genérico — no revelar qué campo falló (Requisito 1.4)
          throw new Error('Correo electrónico o contraseña incorrectos');
        }
        const data: AuthResponse = await res.json();
        const jwtPayload = decodeJwt(data.accessToken);
        const user = { id: jwtPayload.sub, email: jwtPayload.email, role: jwtPayload.role };
        setAuth(user, data.accessToken);
        // Guardar en cookie para que el middleware de Next.js pueda leerlo
        document.cookie = `access_token=${data.accessToken}; path=/; max-age=900; SameSite=Lax`;
        return { user, accessToken: data.accessToken };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Correo electrónico o contraseña incorrectos';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setAuth],
  );

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      clearAuth();
      document.cookie = 'access_token=; path=/; max-age=0; SameSite=Lax';
    }
  }, [clearAuth]);

  const refreshToken = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        clearAuth();
        document.cookie = 'access_token=; path=/; max-age=0; SameSite=Lax';
        return null;
      }
      const data: AuthResponse = await res.json();
      const jwtPayload = decodeJwt(data.accessToken);
      const user = { id: jwtPayload.sub, email: jwtPayload.email, role: jwtPayload.role };
      setAuth(user, data.accessToken);
      document.cookie = `access_token=${data.accessToken}; path=/; max-age=900; SameSite=Lax`;
      return data.accessToken;
    } catch {
      clearAuth();
      document.cookie = 'access_token=; path=/; max-age=0; SameSite=Lax';
      return null;
    }
  }, [setAuth, clearAuth]);

  return {
    user,
    token,
    isAuthenticated: !!user,
    loading,
    error,
    register,
    login,
    logout,
    refreshToken,
  };
}

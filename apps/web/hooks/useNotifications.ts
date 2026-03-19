'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore, type Notificacion } from '../store/notificationStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function authHeaders(token: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Hook para listar notificaciones y marcarlas como leídas (Requisito 8.2) */
export function useNotifications() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const { notificaciones, setNotificaciones, addNotificacion, markAsRead, unreadCount } =
    useNotificationStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  /** Carga las notificaciones desde la API */
  const fetchNotificaciones = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/notificaciones`, {
        headers: authHeaders(token),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al cargar notificaciones');
      const data: Notificacion[] = await res.json();
      setNotificaciones(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, [token, setNotificaciones]);

  /** Marca una notificación como leída en la API y en el store */
  const marcarLeida = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/notificaciones/${id}/leida`, {
          method: 'PATCH',
          headers: authHeaders(token),
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Error al marcar notificación como leída');
        markAsRead(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al marcar notificación');
      }
    },
    [token, markAsRead],
  );

  /** Conecta el listener de Socket.IO para notificaciones en tiempo real */
  useEffect(() => {
    if (!token || !user) return;

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('notificacion', (notificacion: Notificacion) => {
      addNotificacion(notificacion);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user, addNotificacion]);

  /** Carga inicial */
  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  return {
    notificaciones,
    unreadCount,
    loading,
    error,
    marcarLeida,
    refresh: fetchNotificaciones,
  };
}

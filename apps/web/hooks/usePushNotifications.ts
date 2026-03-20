'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function authHeaders(token: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

/** Hook para gestionar notificaciones push del navegador (Requisito 8.2) */
export function usePushNotifications() {
  const token = useAuthStore((s) => s.token);
  const [permissionState, setPermissionState] = useState<PushPermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Detecta soporte y estado de permiso actual */
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setPermissionState('unsupported');
      return;
    }
    setPermissionState(Notification.permission as PushPermissionState);
  }, []);

  /** Registra el Service Worker y verifica si ya hay suscripción activa */
  useEffect(() => {
    if (permissionState === 'unsupported' || !token) return;

    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [permissionState, token]);

  /** Solicita permiso y registra la suscripción push */
  const suscribir = useCallback(async () => {
    if (!token || permissionState === 'unsupported') return;
    setLoading(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission as PushPermissionState);
      if (permission !== 'granted') {
        throw new Error('Permiso de notificaciones denegado');
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = subscription.toJSON();
      const res = await fetch(`${API_URL}/notificaciones/push/subscribe`, {
        method: 'POST',
        headers: authHeaders(token),
        credentials: 'include',
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        }),
      });

      if (!res.ok) throw new Error('Error al registrar suscripción push');
      setIsSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al activar notificaciones push');
    } finally {
      setLoading(false);
    }
  }, [token, permissionState]);

  /** Cancela la suscripción push */
  const desuscribir = useCallback(async () => {
    if (!token || permissionState === 'unsupported') return;
    setLoading(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      const res = await fetch(`${API_URL}/notificaciones/push/subscribe`, {
        method: 'DELETE',
        headers: authHeaders(token),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Error al cancelar suscripción push');
      setIsSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desactivar notificaciones push');
    } finally {
      setLoading(false);
    }
  }, [token, permissionState]);

  return {
    permissionState,
    isSubscribed,
    loading,
    error,
    suscribir,
    desuscribir,
  };
}

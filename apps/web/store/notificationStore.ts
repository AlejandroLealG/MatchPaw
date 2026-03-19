import { create } from 'zustand';

export interface Notificacion {
  id: string;
  tipo: 'nueva_solicitud' | 'cambio_estado_solicitud' | 'donacion_recibida' | 'animal_adoptado';
  titulo: string;
  cuerpo: string;
  leida: boolean;
  createdAt: string;
}

interface NotificationState {
  notificaciones: Notificacion[];
  unreadCount: number;
  setNotificaciones: (notificaciones: Notificacion[]) => void;
  addNotificacion: (notificacion: Notificacion) => void;
  markAsRead: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notificaciones: [],
  unreadCount: 0,
  setNotificaciones: (notificaciones) =>
    set({
      notificaciones,
      unreadCount: notificaciones.filter((n) => !n.leida).length,
    }),
  addNotificacion: (notificacion) =>
    set((state) => ({
      notificaciones: [notificacion, ...state.notificaciones],
      unreadCount: state.unreadCount + (notificacion.leida ? 0 : 1),
    })),
  markAsRead: (id) =>
    set((state) => ({
      notificaciones: state.notificaciones.map((n) => (n.id === id ? { ...n, leida: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
}));

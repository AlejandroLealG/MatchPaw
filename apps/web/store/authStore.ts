import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'adoptante' | 'refugio' | 'admin';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  _hydrated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      _hydrated: false,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: 'matchpaw-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

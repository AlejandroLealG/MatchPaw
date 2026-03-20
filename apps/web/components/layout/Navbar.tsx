'use client';

import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { NotificationBell } from '../features/notifications/NotificationBell';

/** Icono sol */
function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
      />
    </svg>
  );
}

/** Icono luna */
function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"
      />
    </svg>
  );
}

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3"
        aria-label="Navegación principal"
      >
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-bold text-primary hover:opacity-80 dark:text-dark-primary"
        >
          🐾 MatchPaw
        </Link>

        {/* Links centrales */}
        <ul className="hidden items-center gap-6 md:flex">
          {/* Adoptar y Donar: solo para visitantes y adoptantes */}
          {(!user || user.role === 'adoptante') && (
            <>
              <li>
                <Link
                  href="/animales"
                  className="text-sm text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-dark-primary"
                >
                  Adoptar
                </Link>
              </li>
              <li>
                <Link
                  href="/donaciones"
                  className="text-sm text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-dark-primary"
                >
                  Donar
                </Link>
              </li>
            </>
          )}

          {/* Mis solicitudes: solo adoptantes */}
          {user?.role === 'adoptante' && (
            <li>
              <Link
                href="/solicitudes"
                className="text-sm text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-dark-primary"
              >
                Mis solicitudes
              </Link>
            </li>
          )}

          {/* Panel refugio */}
          {user?.role === 'refugio' && (
            <li>
              <Link
                href="/refugio/dashboard"
                className="text-sm text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-dark-primary"
              >
                Mi panel
              </Link>
            </li>
          )}

          {/* Panel admin */}
          {user?.role === 'admin' && (
            <li>
              <Link
                href="/admin/dashboard"
                className="text-sm text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-dark-primary"
              >
                Administración
              </Link>
            </li>
          )}
        </ul>

        {/* Acciones derechas */}
        <div className="flex items-center gap-2">
          {/* Toggle modo oscuro (Requisito diseño — dark mode) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Campana de notificaciones — solo usuarios autenticados (Requisito 8.2) */}
          {user && <NotificationBell />}

          {/* Auth links */}
          {user ? (
            <button
              type="button"
              onClick={clearAuth}
              className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Salir
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Ingresar
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

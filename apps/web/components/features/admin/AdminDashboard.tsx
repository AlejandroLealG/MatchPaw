'use client';

import React, { useState } from 'react';
import { useAdminRefugios, useAdminUsuarios } from '../../../hooks/useAdmin';
import { RefugioVerificationTable } from './RefugioVerificationTable';
import { UserManagementTable } from './UserManagementTable';

type ActiveSection = 'refugios' | 'usuarios';

/**
 * Panel principal del administrador.
 * Layout: columna única en móvil → sidebar fijo + área de contenido en md.
 * Requisitos: 7.1
 */
export function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('refugios');

  const {
    refugios,
    loading: refugiosLoading,
    error: refugiosError,
    verificarRefugio,
  } = useAdminRefugios();
  const {
    usuarios,
    loading: usuariosLoading,
    error: usuariosError,
    toggleActivo,
  } = useAdminUsuarios();

  const pendientesCount = refugios.filter((r) => r.estado === 'pendiente_verificacion').length;

  const handleAprobar = async (id: string) => {
    await verificarRefugio(id, 'aprobar');
  };

  const handleRechazar = async (id: string, motivo: string) => {
    await verificarRefugio(id, 'rechazar', motivo);
  };

  const navItems: { id: ActiveSection; label: string; icon: string; count?: number }[] = [
    { id: 'refugios', label: 'Refugios', icon: '🏠', count: pendientesCount || undefined },
    { id: 'usuarios', label: 'Usuarios', icon: '👥' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-base dark:text-dark-text-base">
          Panel de administración
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Gestiona refugios y usuarios de la plataforma.
        </p>
      </div>

      {/* Layout: columna única en móvil → sidebar + contenido en md */}
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        {/* Sidebar de navegación */}
        <nav
          aria-label="Secciones del panel de administración"
          className="flex flex-row gap-2 md:flex-col md:w-48 md:shrink-0"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              aria-current={activeSection === item.id ? 'page' : undefined}
              className={[
                'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                activeSection === item.id
                  ? 'bg-primary text-white dark:bg-dark-primary dark:text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
              ].join(' ')}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
              {item.count != null && item.count > 0 && (
                <span
                  className={[
                    'ml-auto inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold',
                    activeSection === item.id
                      ? 'bg-white/20 text-white dark:bg-gray-900/20 dark:text-gray-900'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
                  ].join(' ')}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Área de contenido */}
        <div className="flex-1 min-w-0">
          {/* ── Sección: Refugios ── */}
          {activeSection === 'refugios' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-text-base dark:text-dark-text-base">
                Verificación de refugios
              </h2>
              <RefugioVerificationTable
                refugios={refugios}
                loading={refugiosLoading}
                error={refugiosError}
                onAprobar={handleAprobar}
                onRechazar={handleRechazar}
              />
            </div>
          )}

          {/* ── Sección: Usuarios ── */}
          {activeSection === 'usuarios' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-text-base dark:text-dark-text-base">
                Gestión de usuarios
              </h2>
              <UserManagementTable
                usuarios={usuarios}
                loading={usuariosLoading}
                error={usuariosError}
                onToggleActivo={toggleActivo}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

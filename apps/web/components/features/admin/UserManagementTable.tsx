'use client';

import React, { useState } from 'react';
import type { IUser } from '@matchpaw/shared';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Spinner } from '../../ui/Spinner';

export interface UserManagementTableProps {
  usuarios: IUser[];
  loading: boolean;
  error: string | null;
  onToggleActivo: (id: string, activo: boolean) => Promise<void>;
}

const ROLE_LABELS: Record<IUser['role'], string> = {
  adoptante: 'Adoptante',
  refugio: 'Refugio',
  admin: 'Admin',
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function UserManagementTable({
  usuarios,
  loading,
  error,
  onToggleActivo,
}: UserManagementTableProps) {
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleToggle = async (usuario: IUser) => {
    setActionLoadingId(usuario._id);
    setActionError(null);
    try {
      await onToggleActivo(usuario._id, !usuario.activo);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al actualizar el usuario');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner label="Cargando usuarios..." />
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    );
  }

  if (usuarios.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-gray-500 dark:text-gray-400">No hay usuarios para mostrar.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {actionError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {actionError}
        </p>
      )}

      {usuarios.map((usuario) => (
        <Card key={usuario._id} padding="md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-base dark:text-dark-text-base truncate">
                {usuario.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {ROLE_LABELS[usuario.role]} · Registrado: {formatDate(usuario.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Badge
                variant={usuario.activo ? 'aprobada' : 'rechazada'}
                label={usuario.activo ? 'Activo' : 'Suspendido'}
              />

              {usuario.role !== 'admin' && (
                <Button
                  size="sm"
                  variant={usuario.activo ? 'danger' : 'secondary'}
                  loading={actionLoadingId === usuario._id}
                  disabled={actionLoadingId !== null}
                  onClick={() => handleToggle(usuario)}
                >
                  {usuario.activo ? 'Suspender' : 'Activar'}
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import type { IRefugio, RefugioEstado } from '@matchpaw/shared';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { Spinner } from '../../ui/Spinner';

export interface RefugioVerificationTableProps {
  refugios: IRefugio[];
  loading: boolean;
  error: string | null;
  onAprobar: (id: string, motivo?: string) => Promise<void>;
  onRechazar: (id: string, motivo: string) => Promise<void>;
}

const ESTADO_LABELS: Record<RefugioEstado, string> = {
  pendiente_verificacion: 'Pendiente',
  verificado: 'Verificado',
  rechazado: 'Rechazado',
  suspendido: 'Suspendido',
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function RefugioVerificationTable({
  refugios,
  loading,
  error,
  onAprobar,
  onRechazar,
}: RefugioVerificationTableProps) {
  const [rechazarModal, setRechazarModal] = useState<{ open: boolean; refugioId: string | null }>({
    open: false,
    refugioId: null,
  });
  const [motivo, setMotivo] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAprobar = async (id: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await onAprobar(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al aprobar el refugio');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRechazarConfirm = async () => {
    if (!rechazarModal.refugioId || !motivo.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await onRechazar(rechazarModal.refugioId, motivo.trim());
      setRechazarModal({ open: false, refugioId: null });
      setMotivo('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al rechazar el refugio');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner label="Cargando refugios..." />
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

  if (refugios.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-gray-500 dark:text-gray-400">No hay refugios para mostrar.</p>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {refugios.map((refugio) => (
          <Card key={refugio._id} padding="md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-base dark:text-dark-text-base truncate">
                  {refugio.nombre}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {refugio.ciudad} · {refugio.direccion}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Registrado: {formatDate(refugio.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge variant="default" label={ESTADO_LABELS[refugio.estado]} />

                {refugio.estado === 'pendiente_verificacion' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={actionLoading}
                      onClick={() => handleAprobar(refugio._id)}
                    >
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={actionLoading}
                      onClick={() => {
                        setRechazarModal({ open: true, refugioId: refugio._id });
                        setMotivo('');
                        setActionError(null);
                      }}
                    >
                      Rechazar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal de rechazo */}
      <Modal
        open={rechazarModal.open}
        onClose={() => {
          setRechazarModal({ open: false, refugioId: null });
          setActionError(null);
        }}
        title="Rechazar refugio"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="motivo-rechazo"
              className="text-sm font-medium text-text-base dark:text-dark-text-base"
            >
              Motivo del rechazo <span className="text-red-500">*</span>
            </label>
            <textarea
              id="motivo-rechazo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Explica el motivo del rechazo..."
              className="w-full rounded-md border border-gray-300 bg-surface px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 dark:border-gray-600 dark:bg-dark-surface dark:text-dark-text-base dark:focus:ring-dark-primary"
            />
          </div>

          {actionError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {actionError}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={actionLoading}
              onClick={() => {
                setRechazarModal({ open: false, refugioId: null });
                setActionError(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={actionLoading}
              disabled={!motivo.trim()}
              onClick={handleRechazarConfirm}
            >
              Confirmar rechazo
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

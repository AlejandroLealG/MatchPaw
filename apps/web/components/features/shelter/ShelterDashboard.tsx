'use client';

import React, { useState } from 'react';
import type { IAnimal, IRefugio, CreateAnimalDto, UpdateAnimalDto } from '@matchpaw/shared';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { Spinner } from '../../ui/Spinner';
import { MetricsWidget } from './MetricsWidget';
import { AnimalForm } from './AnimalForm';
import { ShelterProfile } from './ShelterProfile';
import {
  useShelterMetrics,
  useShelterRequests,
  useShelterAnimals,
  useShelterProfile,
} from '../../../hooks/useShelterDashboard';
import { useUpdateRequestStatus } from '../../../hooks/useRequests';
import type { UpdateSolicitudEstadoDto } from '@matchpaw/shared';

export interface ShelterDashboardProps {
  refugioId: string;
}

type ActiveSection = 'animales' | 'solicitudes' | 'perfil';

const ESTADO_LABELS: Record<IAnimal['estado'], string> = {
  disponible: 'Disponible',
  en_proceso: 'En proceso',
  adoptado: 'Adoptado',
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Panel principal del refugio.
 * Layout: columna única en móvil → sidebar fijo + área de contenido en md (Req diseño).
 * Requisitos: 2.1–2.4, 7.1–7.3
 */
export function ShelterDashboard({ refugioId }: ShelterDashboardProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('animales');

  // Hooks de datos
  const {
    metricas,
    loading: metricsLoading,
    error: metricsError,
    refresh: refreshMetrics,
  } = useShelterMetrics(refugioId);
  const {
    solicitudes,
    loading: reqLoading,
    error: reqError,
    refresh: refreshRequests,
  } = useShelterRequests();
  const {
    animales,
    loading: animalesLoading,
    error: animalesError,
    createAnimal,
    updateAnimal,
    updateEstado,
  } = useShelterAnimals(refugioId);
  const {
    refugio,
    loading: profileLoading,
    error: profileError,
    updateRefugio: updateRefugioFn,
  } = useShelterProfile(refugioId);
  const updateRefugio = async (data: Partial<IRefugio>): Promise<void> => {
    await updateRefugioFn(data);
  };
  const { updateEstado: updateSolicitudEstado } = useUpdateRequestStatus();

  // Estado del modal de animal
  const [animalModal, setAnimalModal] = useState<{ open: boolean; animal?: IAnimal }>({
    open: false,
  });

  // Estado del modal de cambio de estado rápido (Req 7.3)
  const [estadoModal, setEstadoModal] = useState<{ open: boolean; animal?: IAnimal }>({
    open: false,
  });

  // Estado del modal de solicitud
  const [solicitudModal, setSolicitudModal] = useState<{
    open: boolean;
    solicitudId?: string;
    accion?: 'aprobada' | 'rechazada';
    motivo: string;
  }>({ open: false, motivo: '' });

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAnimalSubmit = async (data: CreateAnimalDto | UpdateAnimalDto) => {
    if (animalModal.animal) {
      await updateAnimal(animalModal.animal._id, data as UpdateAnimalDto);
    } else {
      await createAnimal(data as CreateAnimalDto);
    }
    setAnimalModal({ open: false });
    refreshMetrics();
  };

  const handleEstadoChange = async (estado: IAnimal['estado']) => {
    if (!estadoModal.animal) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await updateEstado(estadoModal.animal._id, estado);
      setEstadoModal({ open: false });
      refreshMetrics();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al cambiar el estado');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSolicitudAction = async () => {
    if (!solicitudModal.solicitudId || !solicitudModal.accion) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const payload: UpdateSolicitudEstadoDto = {
        estado: solicitudModal.accion,
        ...(solicitudModal.motivo ? { motivoRefugio: solicitudModal.motivo } : {}),
      };
      await updateSolicitudEstado(solicitudModal.solicitudId, payload);
      setSolicitudModal({ open: false, motivo: '' });
      refreshRequests();
      refreshMetrics();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al procesar la solicitud');
    } finally {
      setActionLoading(false);
    }
  };

  const navItems: { id: ActiveSection; label: string; icon: string }[] = [
    { id: 'animales', label: 'Mis animales', icon: '🐾' },
    { id: 'solicitudes', label: 'Solicitudes', icon: '📋' },
    { id: 'perfil', label: 'Perfil', icon: '🏠' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Métricas — siempre visibles arriba (Req 7.1) */}
      <div className="mb-6">
        <MetricsWidget metricas={metricas} loading={metricsLoading} error={metricsError} />
      </div>

      {/* Layout: columna única en móvil → sidebar + contenido en md */}
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        {/* Sidebar de navegación */}
        <nav
          aria-label="Secciones del panel"
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
            </button>
          ))}
        </nav>

        {/* Área de contenido */}
        <div className="flex-1 min-w-0">
          {/* ── Sección: Animales ── */}
          {activeSection === 'animales' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-base dark:text-dark-text-base">
                  Mis animales
                </h2>
                <Button size="sm" onClick={() => setAnimalModal({ open: true })}>
                  + Publicar animal
                </Button>
              </div>

              {animalesLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner label="Cargando animales..." />
                </div>
              ) : animalesError ? (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {animalesError}
                </p>
              ) : animales.length === 0 ? (
                <Card padding="lg" className="text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    Aún no has publicado ningún animal.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => setAnimalModal({ open: true })}
                  >
                    Publicar el primero
                  </Button>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {animales.map((animal) => (
                    <Card key={animal._id} padding="md" className="flex items-center gap-4">
                      {/* Foto miniatura */}
                      {animal.fotos[0] ? (
                        <img
                          src={animal.fotos[0].url}
                          alt={animal.nombre}
                          className="h-14 w-14 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-gray-100 dark:bg-gray-700 shrink-0 flex items-center justify-center text-2xl">
                          🐾
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-base dark:text-dark-text-base truncate">
                          {animal.nombre}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {animal.especie} · {animal.raza}
                        </p>
                      </div>

                      <Badge variant={animal.estado} />

                      {/* Acciones */}
                      <div className="flex gap-2 shrink-0">
                        {/* Req 7.3: cambio rápido de estado */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEstadoModal({ open: true, animal })}
                          aria-label={`Cambiar estado de ${animal.nombre}`}
                        >
                          Estado
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAnimalModal({ open: true, animal })}
                          aria-label={`Editar ${animal.nombre}`}
                        >
                          Editar
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Sección: Solicitudes ── */}
          {activeSection === 'solicitudes' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-text-base dark:text-dark-text-base">
                Solicitudes recibidas
              </h2>

              {reqLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner label="Cargando solicitudes..." />
                </div>
              ) : reqError ? (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {reqError}
                </p>
              ) : solicitudes.length === 0 ? (
                <Card padding="lg" className="text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    No hay solicitudes recibidas aún.
                  </p>
                </Card>
              ) : (
                /* Req 7.2: ordenadas de más reciente a más antigua (ya ordenadas en el hook) */
                <div className="flex flex-col gap-3">
                  {solicitudes.map((sol) => (
                    <Card key={sol._id} padding="md">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 min-w-0">
                          {sol.animal && (
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Animal: {sol.animal.nombre}
                            </p>
                          )}
                          <p className="text-sm text-text-base dark:text-dark-text-base">
                            Adoptante ID: {sol.adoptanteId}
                          </p>
                          {sol.descripcionHogar && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {sol.descripcionHogar}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            {formatDate(sol.createdAt)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant={sol.estado} />
                          {sol.estado === 'pendiente' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  setSolicitudModal({
                                    open: true,
                                    solicitudId: sol._id,
                                    accion: 'aprobada',
                                    motivo: '',
                                  })
                                }
                              >
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() =>
                                  setSolicitudModal({
                                    open: true,
                                    solicitudId: sol._id,
                                    accion: 'rechazada',
                                    motivo: '',
                                  })
                                }
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
              )}
            </div>
          )}

          {/* ── Sección: Perfil ── */}
          {activeSection === 'perfil' && (
            <ShelterProfile
              refugio={refugio}
              loading={profileLoading}
              error={profileError}
              onUpdate={updateRefugio}
            />
          )}
        </div>
      </div>

      {/* Modal: Publicar / Editar animal */}
      <Modal
        open={animalModal.open}
        onClose={() => setAnimalModal({ open: false })}
        title={animalModal.animal ? 'Editar animal' : 'Publicar animal'}
        size="xl"
      >
        <AnimalForm
          animal={animalModal.animal}
          onSubmit={handleAnimalSubmit}
          onCancel={() => setAnimalModal({ open: false })}
        />
      </Modal>

      {/* Modal: Cambio rápido de estado (Req 7.3) */}
      <Modal
        open={estadoModal.open}
        onClose={() => {
          setEstadoModal({ open: false });
          setActionError(null);
        }}
        title={`Cambiar estado — ${estadoModal.animal?.nombre ?? ''}`}
        size="sm"
      >
        <div className="flex flex-col gap-3">
          {(['disponible', 'en_proceso', 'adoptado'] as IAnimal['estado'][]).map((estado) => (
            <Button
              key={estado}
              variant={estadoModal.animal?.estado === estado ? 'primary' : 'ghost'}
              fullWidth
              loading={actionLoading && estadoModal.animal?.estado !== estado}
              disabled={actionLoading}
              onClick={() => handleEstadoChange(estado)}
            >
              {ESTADO_LABELS[estado]}
            </Button>
          ))}
          {actionError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {actionError}
            </p>
          )}
        </div>
      </Modal>

      {/* Modal: Aprobar / Rechazar solicitud */}
      <Modal
        open={solicitudModal.open}
        onClose={() => {
          setSolicitudModal({ open: false, motivo: '' });
          setActionError(null);
        }}
        title={solicitudModal.accion === 'aprobada' ? 'Aprobar solicitud' : 'Rechazar solicitud'}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-base dark:text-dark-text-base">
              Motivo (opcional)
            </label>
            <textarea
              value={solicitudModal.motivo}
              onChange={(e) => setSolicitudModal((prev) => ({ ...prev, motivo: e.target.value }))}
              rows={3}
              placeholder="Escribe un mensaje para el adoptante..."
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
              onClick={() => {
                setSolicitudModal({ open: false, motivo: '' });
                setActionError(null);
              }}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              variant={solicitudModal.accion === 'aprobada' ? 'secondary' : 'danger'}
              size="sm"
              loading={actionLoading}
              onClick={handleSolicitudAction}
            >
              {solicitudModal.accion === 'aprobada' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

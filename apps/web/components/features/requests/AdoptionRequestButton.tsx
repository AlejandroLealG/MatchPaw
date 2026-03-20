'use client';

import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { useSendRequest } from '../../../hooks/useRequests';
import { useAuthStore } from '../../../store/authStore';

export interface AdoptionRequestButtonProps {
  animalId: string;
  /** Callback tras enviar exitosamente */
  onSuccess?: () => void;
}

export function AdoptionRequestButton({ animalId, onSuccess }: AdoptionRequestButtonProps) {
  const user = useAuthStore((s) => s.user);
  const { sendRequest, loading, error, clearError } = useSendRequest();

  const [open, setOpen] = useState(false);
  const [descripcionHogar, setDescripcionHogar] = useState('');
  const [experienciaMascotas, setExperienciaMascotas] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Solo adoptantes pueden enviar solicitudes
  if (!user || user.role !== 'adoptante') {
    return (
      <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        Inicia sesión como adoptante para enviar una solicitud.
      </p>
    );
  }

  const handleOpen = () => {
    clearError();
    setSubmitted(false);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setDescripcionHogar('');
    setExperienciaMascotas('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendRequest({ animalId, descripcionHogar, experienciaMascotas });
      setSubmitted(true);
      onSuccess?.();
    } catch {
      // error ya está en el hook
    }
  };

  return (
    <>
      <Button onClick={handleOpen} fullWidth>
        Solicitar adopción
      </Button>

      <Modal open={open} onClose={handleClose} title="Solicitud de adopción" size="md">
        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span className="text-4xl" aria-hidden="true">
              🐾
            </span>
            <p className="text-base font-medium text-text-base dark:text-dark-text-base">
              ¡Solicitud enviada!
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              El refugio revisará tu solicitud y te notificará por correo electrónico.
            </p>
            <Button variant="secondary" onClick={handleClose}>
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cuéntale al refugio un poco sobre ti para que puedan evaluar tu solicitud.
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-base dark:text-dark-text-base">
                Descripción de tu hogar
              </label>
              <textarea
                value={descripcionHogar}
                onChange={(e) => setDescripcionHogar(e.target.value)}
                rows={3}
                placeholder="¿Tienes jardín? ¿Vives en apartamento? ¿Hay niños en casa?"
                className="w-full rounded-md border border-gray-300 bg-surface px-3 py-2 text-sm text-text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-dark-surface dark:text-dark-text-base dark:placeholder-gray-500 dark:focus:ring-dark-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-base dark:text-dark-text-base">
                Experiencia con mascotas
              </label>
              <textarea
                value={experienciaMascotas}
                onChange={(e) => setExperienciaMascotas(e.target.value)}
                rows={3}
                placeholder="¿Has tenido mascotas antes? ¿Tienes otras mascotas actualmente?"
                className="w-full rounded-md border border-gray-300 bg-surface px-3 py-2 text-sm text-text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-dark-surface dark:text-dark-text-base dark:placeholder-gray-500 dark:focus:ring-dark-primary"
              />
            </div>

            {/* Req 5.6: mostrar error si ya existe solicitud activa */}
            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" loading={loading}>
                Enviar solicitud
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

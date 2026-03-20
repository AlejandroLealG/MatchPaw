'use client';

import React, { useState, useEffect } from 'react';
import type { IRefugio } from '@matchpaw/shared';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Card } from '../../ui/Card';
import { Spinner } from '../../ui/Spinner';

export interface ShelterProfileProps {
  refugio: IRefugio | null;
  loading: boolean;
  error: string | null;
  onUpdate: (data: Partial<IRefugio>) => Promise<void>;
}

type ProfileForm = {
  nombre: string;
  descripcion: string;
  ciudad: string;
  direccion: string;
  telefono: string;
};

function toForm(r: IRefugio): ProfileForm {
  return {
    nombre: r.nombre,
    descripcion: r.descripcion,
    ciudad: r.ciudad,
    direccion: r.direccion,
    telefono: r.telefono,
  };
}

const estadoLabel: Record<IRefugio['estado'], string> = {
  pendiente_verificacion: 'Pendiente de verificación',
  verificado: 'Verificado',
  rechazado: 'Rechazado',
  suspendido: 'Suspendido',
};

const estadoColor: Record<IRefugio['estado'], string> = {
  pendiente_verificacion: 'text-amber-600 dark:text-amber-400',
  verificado: 'text-emerald-600 dark:text-emerald-400',
  rechazado: 'text-red-600 dark:text-red-400',
  suspendido: 'text-gray-500 dark:text-gray-400',
};

/** Perfil editable del refugio (Requisito 2.1) */
export function ShelterProfile({ refugio, loading, error, onUpdate }: ShelterProfileProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (refugio) setForm(toForm(refugio));
  }, [refugio]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner label="Cargando perfil..." />
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

  if (!refugio || !form) return null;

  const set = <K extends keyof ProfileForm>(key: K, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onUpdate(form);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(toForm(refugio));
    setSaveError(null);
    setEditing(false);
  };

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-base dark:text-dark-text-base">
          Perfil del refugio
        </h2>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Editar
          </Button>
        )}
      </div>

      {/* Estado de verificación */}
      <p className={['mb-4 text-sm font-medium', estadoColor[refugio.estado]].join(' ')}>
        Estado: {estadoLabel[refugio.estado]}
      </p>
      {refugio.estado === 'rechazado' && refugio.motivoRechazo && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Motivo: {refugio.motivoRechazo}
        </p>
      )}

      {editing ? (
        <form onSubmit={handleSave} noValidate>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Nombre *"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              required
            />
            <Input
              label="Ciudad *"
              value={form.ciudad}
              onChange={(e) => set('ciudad', e.target.value)}
              required
            />
            <Input
              label="Dirección"
              value={form.direccion}
              onChange={(e) => set('direccion', e.target.value)}
            />
            <Input
              label="Teléfono de contacto"
              value={form.telefono}
              onChange={(e) => set('telefono', e.target.value)}
              type="tel"
            />
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-sm font-medium text-text-base dark:text-dark-text-base">
                Descripción
              </label>
              <textarea
                value={form.descripcion}
                onChange={(e) => set('descripcion', e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 bg-surface px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 dark:border-gray-600 dark:bg-dark-surface dark:text-dark-text-base dark:focus:ring-dark-primary"
              />
            </div>
          </div>

          {saveError && (
            <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
              {saveError}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={saving}>
              Guardar
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { label: 'Nombre', value: refugio.nombre },
            { label: 'Ciudad', value: refugio.ciudad },
            { label: 'Dirección', value: refugio.direccion },
            { label: 'Teléfono', value: refugio.telefono },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-sm text-text-base dark:text-dark-text-base">{value || '—'}</p>
            </div>
          ))}
          {refugio.descripcion && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Descripción</p>
              <p className="text-sm text-text-base dark:text-dark-text-base">
                {refugio.descripcion}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

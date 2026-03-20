'use client';

import { useState } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface CreateShelterProfileProps {
  token: string;
  onCreated: (refugioId: string) => void;
}

interface FormState {
  nombre: string;
  descripcion: string;
  ciudad: string;
  direccion: string;
  telefono: string;
}

const EMPTY: FormState = {
  nombre: '',
  descripcion: '',
  ciudad: '',
  direccion: '',
  telefono: '',
};

function validate(f: FormState): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (!f.nombre.trim()) e.nombre = 'El nombre es obligatorio';
  if (!f.descripcion.trim()) e.descripcion = 'La descripción es obligatoria';
  if (!f.ciudad.trim()) e.ciudad = 'La ciudad es obligatoria';
  if (!f.direccion.trim()) e.direccion = 'La dirección es obligatoria';
  if (!f.telefono.trim()) e.telefono = 'El teléfono es obligatorio';
  return e;
}

export function CreateShelterProfile({ token, onCreated }: CreateShelterProfileProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set =
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/refugios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? 'Error al crear el perfil');
      }
      const refugio = await res.json();
      onCreated(refugio._id);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error al crear el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <span className="text-5xl" aria-hidden="true">
          🏠
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-text-base dark:text-dark-text-base">
          Completa el perfil de tu refugio
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Esta información será visible para los adoptantes potenciales.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Nombre del refugio"
          value={form.nombre}
          onChange={set('nombre')}
          error={errors.nombre}
          required
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-base dark:text-dark-text-base">
            Descripción <span aria-hidden="true">*</span>
          </label>
          <textarea
            value={form.descripcion}
            onChange={set('descripcion')}
            rows={3}
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-text-base dark:text-dark-text-base bg-white dark:bg-dark-surface dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          {errors.descripcion && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.descripcion}</p>
          )}
        </div>

        <Input
          label="Ciudad"
          value={form.ciudad}
          onChange={set('ciudad')}
          error={errors.ciudad}
          required
        />
        <Input
          label="Dirección"
          value={form.direccion}
          onChange={set('direccion')}
          error={errors.direccion}
          required
        />
        <Input
          label="Teléfono"
          type="tel"
          value={form.telefono}
          onChange={set('telefono')}
          error={errors.telefono}
          required
        />

        {serverError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {serverError}
          </p>
        )}

        <Button type="submit" fullWidth loading={loading}>
          Crear perfil
        </Button>
      </form>
    </div>
  );
}

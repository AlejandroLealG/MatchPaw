'use client';

import React, { useState, useEffect } from 'react';
import type { IAnimal, CreateAnimalDto, UpdateAnimalDto } from '@matchpaw/shared';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

export interface AnimalFormProps {
  /** Si se pasa, el formulario opera en modo edición */
  animal?: IAnimal;
  onSubmit: (data: CreateAnimalDto | UpdateAnimalDto) => Promise<void>;
  onCancel: () => void;
}

type FormState = {
  nombre: string;
  especie: 'perro' | 'gato' | 'otro';
  raza: string;
  edadMeses: string;
  sexo: 'macho' | 'hembra';
  tamano: 'pequeno' | 'mediano' | 'grande';
  descripcion: string;
  estadoSalud: string;
  vacunado: boolean;
  esterilizado: boolean;
};

const INITIAL: FormState = {
  nombre: '',
  especie: 'perro',
  raza: '',
  edadMeses: '',
  sexo: 'macho',
  tamano: 'mediano',
  descripcion: '',
  estadoSalud: '',
  vacunado: false,
  esterilizado: false,
};

function toFormState(animal: IAnimal): FormState {
  return {
    nombre: animal.nombre,
    especie: animal.especie,
    raza: animal.raza,
    edadMeses: String(animal.edadMeses),
    sexo: animal.sexo,
    tamano: animal.tamano,
    descripcion: animal.descripcion,
    estadoSalud: animal.estadoSalud,
    vacunado: animal.vacunado,
    esterilizado: animal.esterilizado,
  };
}

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
  if (!form.raza.trim()) errors.raza = 'La raza es obligatoria';
  const edad = parseInt(form.edadMeses, 10);
  if (isNaN(edad) || edad < 0) errors.edadMeses = 'Ingresa una edad válida en meses';
  if (!form.descripcion.trim()) errors.descripcion = 'La descripción es obligatoria';
  if (!form.estadoSalud.trim()) errors.estadoSalud = 'El estado de salud es obligatorio';
  return errors;
}

const selectClass =
  'w-full rounded-md border border-gray-300 bg-surface px-3 py-2 text-sm text-text-base ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ' +
  'dark:border-gray-600 dark:bg-dark-surface dark:text-dark-text-base dark:focus:ring-dark-primary';

/**
 * Formulario para publicar o editar un animal (Requisitos 2.2, 2.3).
 * Layout: 1 columna en móvil → 2 columnas en md.
 */
export function AnimalForm({ animal, onSubmit, onCancel }: AnimalFormProps) {
  const isEdit = !!animal;
  const [form, setForm] = useState<FormState>(animal ? toFormState(animal) : INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sincronizar si cambia el animal (ej. abrir modal con otro animal).
  // Intencionalmente solo reacciona al cambio de identidad (_id), no al objeto completo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setForm(animal ? toFormState(animal) : INITIAL);
    setErrors({});
    setSubmitError(null);
  }, [animal?._id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    setSubmitError(null);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        especie: form.especie,
        raza: form.raza.trim(),
        edadMeses: parseInt(form.edadMeses, 10),
        sexo: form.sexo,
        tamano: form.tamano,
        descripcion: form.descripcion.trim(),
        estadoSalud: form.estadoSalud.trim(),
        vacunado: form.vacunado,
        esterilizado: form.esterilizado,
        // Las fotos se gestionan por separado; en creación se envía array vacío
        ...(isEdit ? {} : { fotos: [] }),
      };
      await onSubmit(payload);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al guardar el animal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Layout: 1 columna en móvil → 2 columnas en md (Req diseño) */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Columna izquierda */}
        <div className="flex flex-col gap-4">
          <Input
            label="Nombre *"
            value={form.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            error={errors.nombre}
            placeholder="Ej: Luna"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-base dark:text-dark-text-base">
              Especie *
            </label>
            <select
              value={form.especie}
              onChange={(e) => set('especie', e.target.value as FormState['especie'])}
              className={selectClass}
            >
              <option value="perro">Perro</option>
              <option value="gato">Gato</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <Input
            label="Raza *"
            value={form.raza}
            onChange={(e) => set('raza', e.target.value)}
            error={errors.raza}
            placeholder="Ej: Labrador"
          />

          <Input
            label="Edad (meses) *"
            type="number"
            min={0}
            value={form.edadMeses}
            onChange={(e) => set('edadMeses', e.target.value)}
            error={errors.edadMeses}
            placeholder="Ej: 6"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-base dark:text-dark-text-base">
              Sexo *
            </label>
            <select
              value={form.sexo}
              onChange={(e) => set('sexo', e.target.value as FormState['sexo'])}
              className={selectClass}
            >
              <option value="macho">Macho</option>
              <option value="hembra">Hembra</option>
            </select>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-base dark:text-dark-text-base">
              Tamaño *
            </label>
            <select
              value={form.tamano}
              onChange={(e) => set('tamano', e.target.value as FormState['tamano'])}
              className={selectClass}
            >
              <option value="pequeno">Pequeño</option>
              <option value="mediano">Mediano</option>
              <option value="grande">Grande</option>
            </select>
          </div>

          <Input
            label="Estado de salud *"
            value={form.estadoSalud}
            onChange={(e) => set('estadoSalud', e.target.value)}
            error={errors.estadoSalud}
            placeholder="Ej: Saludable, vacunas al día"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-base dark:text-dark-text-base">
              Descripción *
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              rows={4}
              placeholder="Describe la personalidad y necesidades del animal..."
              className={[
                'w-full rounded-md border px-3 py-2 text-sm resize-none',
                'bg-surface text-text-base placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-offset-1',
                'dark:bg-dark-surface dark:text-dark-text-base dark:placeholder-gray-500',
                errors.descripcion
                  ? 'border-red-500 focus:ring-red-400 dark:border-red-400'
                  : 'border-gray-300 focus:ring-primary dark:border-gray-600 dark:focus:ring-dark-primary',
              ].join(' ')}
            />
            {errors.descripcion && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {errors.descripcion}
              </p>
            )}
          </div>

          {/* Checkboxes */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-text-base dark:text-dark-text-base">
              <input
                type="checkbox"
                checked={form.vacunado}
                onChange={(e) => set('vacunado', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600"
              />
              Vacunado
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-text-base dark:text-dark-text-base">
              <input
                type="checkbox"
                checked={form.esterilizado}
                onChange={(e) => set('esterilizado', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600"
              />
              Esterilizado
            </label>
          </div>
        </div>
      </div>

      {/* Error de envío */}
      {submitError && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {submitError}
        </p>
      )}

      {/* Acciones */}
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? 'Guardar cambios' : 'Publicar animal'}
        </Button>
      </div>
    </form>
  );
}

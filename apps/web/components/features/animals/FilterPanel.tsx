'use client';

import React, { useState } from 'react';
import type { PetsFilters } from '../../../hooks/usePets';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

export interface FilterPanelProps {
  filters: PetsFilters;
  onApply: (filters: PetsFilters) => void;
  /** En móvil el panel se muestra como drawer controlado externamente */
  open?: boolean;
  onClose?: () => void;
}

const ESPECIE_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'perro', label: 'Perro' },
  { value: 'gato', label: 'Gato' },
  { value: 'otro', label: 'Otro' },
] as const;

const SEXO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'macho', label: 'Macho' },
  { value: 'hembra', label: 'Hembra' },
] as const;

const TAMANO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pequeno', label: 'Pequeño' },
  { value: 'mediano', label: 'Mediano' },
  { value: 'grande', label: 'Grande' },
] as const;

const ORDER_OPTIONS = [
  { value: 'reciente', label: 'Más reciente' },
  { value: 'antiguo', label: 'Más antiguo' },
] as const;

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-text-base dark:text-dark-text-base">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-300 bg-surface px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-dark-surface dark:text-dark-text-base dark:focus:ring-dark-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterForm({
  filters,
  onApply,
  onClose,
}: {
  filters: PetsFilters;
  onApply: (f: PetsFilters) => void;
  onClose?: () => void;
}) {
  const [local, setLocal] = useState<PetsFilters>(filters);

  const set = <K extends keyof PetsFilters>(key: K, value: PetsFilters[K]) =>
    setLocal((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Limpiar valores vacíos antes de aplicar
    const cleaned = Object.fromEntries(
      Object.entries(local).filter(([, v]) => v !== '' && v !== undefined),
    ) as PetsFilters;
    onApply(cleaned);
    onClose?.();
  };

  const handleReset = () => {
    setLocal({});
    onApply({});
    onClose?.();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <SelectField
        label="Especie"
        value={local.especie ?? ''}
        onChange={(v) => set('especie', v as PetsFilters['especie'])}
        options={ESPECIE_OPTIONS}
      />
      <Input
        label="Raza"
        value={local.raza ?? ''}
        onChange={(e) => set('raza', e.target.value)}
        placeholder="Ej: Labrador"
      />
      <SelectField
        label="Sexo"
        value={local.sexo ?? ''}
        onChange={(v) => set('sexo', v as PetsFilters['sexo'])}
        options={SEXO_OPTIONS}
      />
      <SelectField
        label="Tamaño"
        value={local.tamano ?? ''}
        onChange={(v) => set('tamano', v as PetsFilters['tamano'])}
        options={TAMANO_OPTIONS}
      />
      <Input
        label="Ciudad"
        value={local.ciudad ?? ''}
        onChange={(e) => set('ciudad', e.target.value)}
        placeholder="Ej: Bogotá"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Edad mín. (meses)"
          type="number"
          min={0}
          value={local.edadMinMeses ?? ''}
          onChange={(e) => set('edadMinMeses', e.target.value ? Number(e.target.value) : undefined)}
        />
        <Input
          label="Edad máx. (meses)"
          type="number"
          min={0}
          value={local.edadMaxMeses ?? ''}
          onChange={(e) => set('edadMaxMeses', e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>
      <SelectField
        label="Ordenar por"
        value={local.orderBy ?? 'reciente'}
        onChange={(v) => set('orderBy', v as PetsFilters['orderBy'])}
        options={ORDER_OPTIONS}
      />

      <div className="flex gap-2 pt-2">
        <Button type="submit" fullWidth>
          Aplicar
        </Button>
        <Button type="button" variant="ghost" fullWidth onClick={handleReset}>
          Limpiar
        </Button>
      </div>
    </form>
  );
}

/**
 * FilterPanel — drawer en móvil, columna lateral fija en lg (Requisito 3.2, 3.6)
 * En pantallas < lg se controla con open/onClose.
 * En pantallas lg+ siempre visible como sidebar.
 */
export function FilterPanel({ filters, onApply, open = false, onClose }: FilterPanelProps) {
  return (
    <>
      {/* Sidebar fijo — visible solo en lg+ */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-4 rounded-xl border border-gray-100 bg-surface p-5 shadow-md dark:border-gray-700 dark:bg-dark-surface">
          <h2 className="mb-4 text-base font-semibold text-text-base dark:text-dark-text-base">
            Filtros
          </h2>
          <FilterForm filters={filters} onApply={onApply} />
        </div>
      </aside>

      {/* Drawer — visible solo en móvil cuando open=true */}
      {open && (
        <div
          className="fixed inset-0 z-40 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filtros"
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70"
            aria-hidden="true"
            onClick={onClose}
          />
          {/* Panel deslizante desde la izquierda */}
          <div className="relative z-50 flex h-full w-72 flex-col overflow-y-auto bg-surface p-5 shadow-xl dark:bg-dark-surface">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-base dark:text-dark-text-base">
                Filtros
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar filtros"
                className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <FilterForm filters={filters} onApply={onApply} onClose={onClose} />
          </div>
        </div>
      )}
    </>
  );
}

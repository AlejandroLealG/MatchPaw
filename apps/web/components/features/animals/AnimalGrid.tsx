import React from 'react';
import type { IAnimal } from '@matchpaw/shared';
import { AnimalCard } from './AnimalCard';
import { Spinner } from '../../ui/Spinner';

export interface AnimalGridProps {
  animals: IAnimal[];
  loading?: boolean;
  emptyMessage?: string;
}

export function AnimalGrid({
  animals,
  loading = false,
  emptyMessage = 'No se encontraron animales. Intenta ampliar o modificar los filtros.',
}: AnimalGridProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Cargando animales..." />
      </div>
    );
  }

  if (animals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500 dark:text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mb-4 h-12 w-12 opacity-40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    // Requisito 3.1 — grid responsivo mobile-first
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="list">
      {animals.map((animal) => (
        <li key={animal._id}>
          <AnimalCard animal={animal} />
        </li>
      ))}
    </ul>
  );
}

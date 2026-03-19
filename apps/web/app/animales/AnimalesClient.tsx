'use client';

import React, { useState } from 'react';
import { usePets } from '../../hooks/usePets';
import { AnimalGrid } from '../../components/features/animals/AnimalGrid';
import { FilterPanel } from '../../components/features/animals/FilterPanel';
import { Pagination } from '../../components/ui/Pagination';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function AnimalesClient() {
  const { animals, loading, error, page, totalPages, total, filters, applyFilters, changePage } =
    usePets({ orderBy: 'reciente' });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchText, setSearchText] = useState(filters.q ?? '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ ...filters, q: searchText || undefined });
  };

  return (
    <div className="min-h-screen bg-bg-base dark:bg-dark-bg-base">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Encabezado */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-base dark:text-dark-text-base">
            Animales en adopción
          </h1>
          {!loading && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {total} {total === 1 ? 'animal encontrado' : 'animales encontrados'}
            </p>
          )}
        </div>

        {/* Barra de búsqueda + botón filtros (móvil) */}
        <div className="mb-6 flex gap-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
            <Input
              aria-label="Buscar animales"
              placeholder="Buscar por nombre, raza o descripción..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="md">
              Buscar
            </Button>
          </form>
          {/* Botón filtros solo visible en móvil */}
          <Button
            type="button"
            variant="ghost"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir filtros"
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
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Filtros
          </Button>
        </div>

        <div className="flex gap-8">
          {/* Sidebar de filtros (lg+) + drawer (móvil) */}
          <FilterPanel
            filters={filters}
            onApply={(f) => applyFilters({ ...f, q: searchText || undefined })}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />

          {/* Contenido principal */}
          <div className="min-w-0 flex-1">
            {error && (
              <p
                role="alert"
                className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
              >
                {error}
              </p>
            )}

            <AnimalGrid animals={animals} loading={loading} />

            {!loading && totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination page={page} totalPages={totalPages} onPageChange={changePage} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

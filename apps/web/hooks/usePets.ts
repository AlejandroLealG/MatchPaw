'use client';

import { useState, useCallback, useEffect } from 'react';
import type { IAnimal } from '@matchpaw/shared';
import type { AnimalFilterDto } from '@matchpaw/shared';
import type { PaginatedResponseDto } from '@matchpaw/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface AnimalDetalle extends IAnimal {
  refugio?: {
    _id: string;
    nombre: string;
    telefono: string;
    ciudad: string;
    fotoUrl?: string;
  };
  /** true solo si estado === 'disponible' (Requisitos 4.3, 4.4) */
  canRequest: boolean;
}

export type PetsFilters = Omit<AnimalFilterDto, 'page' | 'limit'>;

function buildQueryString(filters: AnimalFilterDto): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

/** Hook para búsqueda paginada de animales con filtros (Requisitos 3.1–3.6) */
export function usePets(initialFilters: PetsFilters = {}) {
  const [filters, setFilters] = useState<PetsFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const [data, setData] = useState<PaginatedResponseDto<IAnimal> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPets = useCallback(
    async (currentFilters: PetsFilters, currentPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const qs = buildQueryString({ ...currentFilters, page: currentPage, limit });
        const res = await fetch(`${API_URL}/animales?${qs}`);
        if (!res.ok) throw new Error('Error al cargar los animales');
        const json: PaginatedResponseDto<IAnimal> = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar los animales');
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    fetchPets(filters, page);
  }, [filters, page, fetchPets]);

  const applyFilters = useCallback((newFilters: PetsFilters) => {
    setFilters(newFilters);
    setPage(1); // reset a primera página al cambiar filtros
  }, []);

  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const refresh = useCallback(() => {
    fetchPets(filters, page);
  }, [fetchPets, filters, page]);

  return {
    animals: data?.data ?? [],
    total: data?.total ?? 0,
    page,
    totalPages: data?.totalPages ?? 0,
    limit,
    filters,
    loading,
    error,
    applyFilters,
    changePage,
    refresh,
  };
}

/** Hook para obtener el detalle de un animal por ID (Requisitos 4.1–4.4) */
export function usePetDetail(id: string) {
  const [animal, setAnimal] = useState<AnimalDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/animales/${id}`);
        if (!res.ok) throw new Error('Animal no encontrado');
        const json: AnimalDetalle = await res.json();
        if (!cancelled) setAnimal(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar el animal');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { animal, loading, error };
}

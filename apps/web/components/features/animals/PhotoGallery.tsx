'use client';

import React, { useState } from 'react';
import type { IFoto } from '@matchpaw/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function resolveImageUrl(url: string): string {
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
}

export interface PhotoGalleryProps {
  fotos: IFoto[];
  nombre: string;
}

export function PhotoGallery({ fotos, nombre }: PhotoGalleryProps) {
  const sorted = [...fotos].sort((a, b) => a.orden - b.orden);
  const [active, setActive] = useState(0);

  if (sorted.length === 0) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Imagen principal */}
      <div className="relative h-72 w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 sm:h-96">
        <img
          src={resolveImageUrl(sorted[active].url)}
          alt={`${nombre} — foto ${active + 1}`}
          className="h-full w-full object-cover"
        />
        {/* Navegación con flechas si hay más de una foto */}
        {sorted.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActive((prev) => (prev - 1 + sorted.length) % sorted.length)}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setActive((prev) => (prev + 1) % sorted.length)}
              aria-label="Foto siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Miniaturas">
          {sorted.map((foto, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActive(idx)}
              aria-label={`Ver foto ${idx + 1}`}
              aria-current={idx === active ? 'true' : undefined}
              className={[
                'h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                idx === active
                  ? 'border-primary dark:border-dark-primary'
                  : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600',
              ].join(' ')}
            >
              <img
                src={resolveImageUrl(foto.url)}
                alt={`${nombre} miniatura ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Número máximo de botones de página visibles (sin contar anterior/siguiente). Por defecto 5. */
  maxVisible?: number;
  className?: string;
}

function buildPageRange(current: number, total: number, maxVisible: number): (number | '...')[] {
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, current - half);
  let end = start + maxVisible - 1;

  if (end > total) {
    end = total;
    start = Math.max(1, end - maxVisible + 1);
  }

  const pages: (number | '...')[] = [];

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('...');
  }

  for (let i = start; i <= end; i++) pages.push(i);

  if (end < total) {
    if (end < total - 1) pages.push('...');
    pages.push(total);
  }

  return pages;
}

const baseBtn =
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors duration-150 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ' +
  'disabled:opacity-40 disabled:cursor-not-allowed h-9 min-w-[2.25rem] px-2';

const activeBtn = 'bg-primary text-white dark:bg-dark-primary dark:text-gray-900';

const inactiveBtn =
  'bg-transparent text-text-base border border-gray-300 hover:bg-gray-100 ' +
  'dark:text-dark-text-base dark:border-gray-600 dark:hover:bg-gray-700';

export function Pagination({
  page,
  totalPages,
  onPageChange,
  maxVisible = 5,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageRange(page, totalPages, maxVisible);

  return (
    <nav
      role="navigation"
      aria-label="Paginación"
      className={['flex items-center gap-1', className].join(' ')}
    >
      {/* Anterior */}
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
        className={[baseBtn, inactiveBtn].join(' ')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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

      {/* Páginas numeradas */}
      {pages.map((p, idx) =>
        p === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            className="inline-flex h-9 min-w-[2.25rem] items-center justify-center text-sm text-gray-400 dark:text-gray-500"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-label={`Página ${p}`}
            aria-current={p === page ? 'page' : undefined}
            className={[baseBtn, p === page ? activeBtn : inactiveBtn].join(' ')}
          >
            {p}
          </button>
        ),
      )}

      {/* Siguiente */}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Página siguiente"
        className={[baseBtn, inactiveBtn].join(' ')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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
    </nav>
  );
}

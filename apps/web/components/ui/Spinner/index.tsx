import React from 'react';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
};

export function Spinner({ size = 'md', label = 'Cargando...', className = '' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={['inline-flex', className].join(' ')}>
      <span
        className={[
          'animate-spin rounded-full',
          'border-gray-200 border-t-primary',
          'dark:border-gray-700 dark:border-t-dark-primary',
          sizeClasses[size],
        ].join(' ')}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

'use client';

import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, id, className = '', ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const describedBy = [error ? errorId : null, helperText && !error ? helperId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-text-base dark:text-dark-text-base"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-describedby={describedBy || undefined}
        aria-invalid={!!error}
        className={[
          'w-full rounded-md border px-3 py-2 text-sm',
          'bg-surface text-text-base placeholder-gray-400',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error
            ? 'border-red-500 focus:ring-red-400 dark:border-red-400 dark:focus:ring-red-400'
            : 'border-gray-300 focus:ring-primary dark:border-gray-600 dark:focus:ring-dark-primary',
          'dark:bg-dark-surface dark:text-dark-text-base dark:placeholder-gray-500',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-xs text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
}

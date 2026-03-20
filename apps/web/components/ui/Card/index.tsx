import React from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  children: React.ReactNode;
  padding?: CardPadding;
  shadow?: boolean;
  className?: string;
  as?: React.ElementType;
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

export function Card({
  children,
  padding = 'md',
  shadow = true,
  className = '',
  as: Tag = 'div',
}: CardProps) {
  return (
    <Tag
      className={[
        'rounded-xl bg-surface dark:bg-dark-surface',
        'border border-gray-100 dark:border-gray-700',
        shadow ? 'shadow-md dark:shadow-gray-900/40' : '',
        paddingClasses[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  );
}

import React from 'react';
import Link from 'next/link';
import type { IAnimal } from '@matchpaw/shared';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';

export interface AnimalCardProps {
  animal: IAnimal;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function resolveImageUrl(url: string): string {
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
}

const especieLabel: Record<IAnimal['especie'], string> = {
  perro: 'Perro',
  gato: 'Gato',
  otro: 'Otro',
};

const tamanoLabel: Record<IAnimal['tamano'], string> = {
  pequeno: 'Pequeño',
  mediano: 'Mediano',
  grande: 'Grande',
};

export function AnimalCard({ animal }: AnimalCardProps) {
  const foto = animal.fotos.find((f) => f.orden === 0) ?? animal.fotos[0];

  return (
    <Link href={`/animales/${animal._id}`} className="group block focus:outline-none">
      <Card
        padding="none"
        className="overflow-hidden transition-shadow group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-primary"
      >
        {/* Imagen */}
        <div className="relative h-48 w-full bg-gray-100 dark:bg-gray-800">
          {foto ? (
            <img
              src={resolveImageUrl(foto.url)}
              alt={animal.nombre}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-600">
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
          )}
          <div className="absolute top-2 right-2">
            <Badge variant={animal.estado} />
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-text-base dark:text-dark-text-base truncate">
            {animal.nombre}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {especieLabel[animal.especie]} · {animal.raza}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <span>{tamanoLabel[animal.tamano]}</span>
            <span>·</span>
            <span>{animal.sexo === 'macho' ? 'Macho' : 'Hembra'}</span>
            <span>·</span>
            <span>
              {animal.edadMeses < 12
                ? `${animal.edadMeses} mes${animal.edadMeses !== 1 ? 'es' : ''}`
                : `${Math.floor(animal.edadMeses / 12)} año${Math.floor(animal.edadMeses / 12) !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

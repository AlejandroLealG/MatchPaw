import React from 'react';
import type { AnimalDetalle } from '../../../hooks/usePets';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { PhotoGallery } from './PhotoGallery';

export interface AnimalDetailViewProps {
  animal: AnimalDetalle;
  /** Slot para el botón de solicitud — se renderiza solo si animal.canRequest */
  requestSlot?: React.ReactNode;
}

const especieLabel: Record<AnimalDetalle['especie'], string> = {
  perro: 'Perro',
  gato: 'Gato',
  otro: 'Otro',
};

const tamanoLabel: Record<AnimalDetalle['tamano'], string> = {
  pequeno: 'Pequeño',
  mediano: 'Mediano',
  grande: 'Grande',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="min-w-[120px] text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className="text-sm text-text-base dark:text-dark-text-base">{value}</span>
    </div>
  );
}

export function AnimalDetailView({ animal, requestSlot }: AnimalDetailViewProps) {
  const edadTexto =
    animal.edadMeses < 12
      ? `${animal.edadMeses} mes${animal.edadMeses !== 1 ? 'es' : ''}`
      : `${Math.floor(animal.edadMeses / 12)} año${Math.floor(animal.edadMeses / 12) !== 1 ? 's' : ''}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Galería de fotos (Requisito 4.1) */}
        <div>
          <PhotoGallery fotos={animal.fotos} nombre={animal.nombre} />
        </div>

        {/* Información principal */}
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-base dark:text-dark-text-base">
                {animal.nombre}
              </h1>
              <Badge variant={animal.estado} />
            </div>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {especieLabel[animal.especie]} · {animal.raza}
            </p>
          </div>

          <Card padding="md">
            <div className="flex flex-col gap-3">
              <InfoRow label="Edad" value={edadTexto} />
              <InfoRow label="Sexo" value={animal.sexo === 'macho' ? 'Macho' : 'Hembra'} />
              <InfoRow label="Tamaño" value={tamanoLabel[animal.tamano]} />
              <InfoRow label="Estado de salud" value={animal.estadoSalud} />
              <InfoRow
                label="Vacunado"
                value={
                  <span
                    className={
                      animal.vacunado
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-500 dark:text-red-400'
                    }
                  >
                    {animal.vacunado ? 'Sí' : 'No'}
                  </span>
                }
              />
              <InfoRow
                label="Esterilizado"
                value={
                  <span
                    className={
                      animal.esterilizado
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-500 dark:text-red-400'
                    }
                  >
                    {animal.esterilizado ? 'Sí' : 'No'}
                  </span>
                }
              />
            </div>
          </Card>

          {/* Descripción */}
          <div>
            <h2 className="mb-2 text-base font-semibold text-text-base dark:text-dark-text-base">
              Descripción
            </h2>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {animal.descripcion}
            </p>
          </div>

          {/* Datos del refugio (Requisito 4.2) */}
          {animal.refugio && (
            <Card padding="md">
              <h2 className="mb-3 text-base font-semibold text-text-base dark:text-dark-text-base">
                Refugio responsable
              </h2>
              <div className="flex flex-col gap-2">
                <InfoRow label="Nombre" value={animal.refugio.nombre} />
                <InfoRow label="Ciudad" value={animal.refugio.ciudad} />
                <InfoRow
                  label="Teléfono"
                  value={
                    <a
                      href={`tel:${animal.refugio.telefono}`}
                      className="text-primary hover:underline dark:text-dark-primary"
                    >
                      {animal.refugio.telefono}
                    </a>
                  }
                />
              </div>
            </Card>
          )}

          {/* Botón de solicitud o estado (Requisitos 4.3, 4.4) */}
          <div>
            {animal.canRequest ? (
              requestSlot
            ) : (
              <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {animal.estado === 'adoptado'
                  ? 'Este animal ya fue adoptado.'
                  : 'Este animal tiene una solicitud en proceso.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

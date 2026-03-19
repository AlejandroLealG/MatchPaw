import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { AnimalDetalle } from '../../../hooks/usePets';
import { AnimalDetailView } from '../../../components/features/animals/AnimalDetailView';

interface Props {
  params: { id: string };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function fetchAnimal(id: string): Promise<AnimalDetalle | null> {
  try {
    const res = await fetch(`${API_URL}/animales/${id}`, {
      // Revalidar cada 60 segundos para mantener el estado actualizado
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const animal = await fetchAnimal(params.id);
  if (!animal) return { title: 'Animal no encontrado — MatchPaw' };
  return {
    title: `${animal.nombre} — MatchPaw`,
    description: animal.descripcion,
  };
}

export default async function AnimalDetallePage({ params }: Props) {
  const animal = await fetchAnimal(params.id);

  if (!animal) notFound();

  return (
    <main>
      {/*
        requestSlot se pasa vacío aquí — el botón de solicitud se implementa
        en la tarea 17 (AdoptionRequestButton). Por ahora se muestra el estado
        del animal correctamente (Requisitos 4.3, 4.4).
      */}
      <AnimalDetailView
        animal={animal}
        requestSlot={
          // Placeholder hasta que AdoptionRequestButton esté disponible (tarea 17)
          <p className="rounded-lg bg-surface-alt px-4 py-3 text-sm text-primary dark:bg-gray-800 dark:text-dark-primary">
            Inicia sesión para enviar una solicitud de adopción.
          </p>
        }
      />
    </main>
  );
}

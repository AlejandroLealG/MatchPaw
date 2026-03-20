import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { IRefugio } from '@matchpaw/shared';
import type { IAnimal } from '@matchpaw/shared';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

interface Props {
  params: { id: string };
}

interface RefugioPublico extends IRefugio {
  animales?: IAnimal[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function fetchRefugio(id: string): Promise<RefugioPublico | null> {
  try {
    const [refugioRes, animalesRes] = await Promise.all([
      fetch(`${API_URL}/refugios/${id}`, { next: { revalidate: 60 } }),
      fetch(`${API_URL}/refugios/${id}/animales`, { next: { revalidate: 60 } }),
    ]);
    if (!refugioRes.ok) return null;
    const refugio: IRefugio = await refugioRes.json();
    const animales: IAnimal[] = animalesRes.ok ? await animalesRes.json() : [];
    return { ...refugio, animales };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const refugio = await fetchRefugio(params.id);
  if (!refugio) return { title: 'Refugio no encontrado — MatchPaw' };
  return {
    title: `${refugio.nombre} — MatchPaw`,
    description: refugio.descripcion,
  };
}

function AnimalCard({ animal }: { animal: IAnimal }) {
  const foto = animal.fotos[0];
  return (
    <a
      href={`/animales/${animal._id}`}
      className="group block rounded-xl overflow-hidden border border-gray-100 bg-surface shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-dark-surface"
    >
      <div className="aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        {foto ? (
          <img
            src={foto.url}
            alt={animal.nombre}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl" aria-hidden="true">
            🐾
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-text-base dark:text-dark-text-base truncate">
            {animal.nombre}
          </p>
          <Badge variant={animal.estado} />
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {animal.especie} · {animal.raza}
        </p>
      </div>
    </a>
  );
}

/** Perfil público del refugio con sus animales (Requisito 2.1) */
export default async function RefugioPerfilPage({ params }: Props) {
  const refugio = await fetchRefugio(params.id);

  if (!refugio) notFound();

  const animalesDisponibles = (refugio.animales ?? []).filter((a) => a.estado === 'disponible');

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Cabecera del refugio */}
      <Card padding="lg" className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Foto del refugio */}
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
            {refugio.fotoUrl ? (
              <img
                src={refugio.fotoUrl}
                alt={`Foto de ${refugio.nombre}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-4xl" aria-hidden="true">
                🏠
              </div>
            )}
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-text-base dark:text-dark-text-base">
              {refugio.nombre}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              📍 {refugio.ciudad}
              {refugio.direccion ? ` · ${refugio.direccion}` : ''}
            </p>
            {refugio.telefono && (
              <a
                href={`tel:${refugio.telefono}`}
                className="mt-1 inline-block text-sm text-primary hover:underline dark:text-dark-primary"
              >
                📞 {refugio.telefono}
              </a>
            )}
            {refugio.descripcion && (
              <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {refugio.descripcion}
              </p>
            )}
          </div>

          {/* Botón de donación */}
          <a
            href={`/donaciones?refugioId=${refugio._id}&refugioNombre=${encodeURIComponent(refugio.nombre)}`}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-dark-primary dark:text-gray-900 dark:hover:bg-blue-400 shrink-0"
          >
            💚 Donar
          </a>
        </div>
      </Card>

      {/* Animales disponibles */}
      <section aria-labelledby="animales-heading">
        <h2
          id="animales-heading"
          className="mb-4 text-xl font-semibold text-text-base dark:text-dark-text-base"
        >
          Animales en adopción
          {animalesDisponibles.length > 0 && (
            <span className="ml-2 text-base font-normal text-gray-500 dark:text-gray-400">
              ({animalesDisponibles.length})
            </span>
          )}
        </h2>

        {animalesDisponibles.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Este refugio no tiene animales disponibles en este momento.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {animalesDisponibles.map((animal) => (
              <AnimalCard key={animal._id} animal={animal} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

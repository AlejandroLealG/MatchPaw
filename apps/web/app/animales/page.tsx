import type { Metadata } from 'next';
import { AnimalesClient } from './AnimalesClient';

export const metadata: Metadata = {
  title: 'Animales en adopción — MatchPaw',
  description:
    'Encuentra tu compañero ideal. Busca y filtra animales disponibles para adopción en refugios verificados.',
};

// La búsqueda es dinámica (filtros del usuario), se renderiza en el servidor
// pero la interactividad se delega al Client Component.
export default function AnimalesPage() {
  return <AnimalesClient />;
}

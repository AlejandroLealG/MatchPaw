import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MatchPaw',
  description: 'Conectando refugios con adoptantes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

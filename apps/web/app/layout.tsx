import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/layout/Providers';
import { Navbar } from '../components/layout/Navbar';

export const metadata: Metadata = {
  title: 'MatchPaw',
  description: 'Conectando refugios con adoptantes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Aplica el tema antes de la hidratación para evitar flash y mismatch */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('matchpaw-theme');var theme=t?JSON.parse(t).state?.theme:'light';if(theme==='dark')document.documentElement.classList.add('dark');}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-bg-base text-text-base dark:bg-dark-bg-base dark:text-dark-text-base">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}

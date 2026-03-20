import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MatchPaw — Acceso',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-base dark:text-dark-text-base">MatchPaw</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Conectando refugios con adoptantes
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-8">
          {children}
        </div>
      </div>
    </main>
  );
}

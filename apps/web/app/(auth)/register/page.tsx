'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RegisterForm } from '../../../components/features/auth/RegisterForm';

function redirectByRole(role: string, router: ReturnType<typeof useRouter>) {
  if (role === 'refugio') router.push('/refugio/dashboard');
  else if (role === 'admin') router.push('/admin/dashboard');
  else router.push('/animales');
}

export default function RegisterPage() {
  const router = useRouter();

  return (
    <>
      <h2 className="text-xl font-semibold text-text-base dark:text-dark-text-base mb-6">
        Crear cuenta
      </h2>

      <RegisterForm onSuccess={(role) => redirectByRole(role, router)} />

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-primary hover:underline dark:text-dark-primary">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}

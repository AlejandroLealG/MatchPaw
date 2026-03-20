'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ForgotPasswordForm } from '../../../components/features/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <>
      <h2 className="text-xl font-semibold text-text-base dark:text-dark-text-base mb-2">
        Recuperar contraseña
      </h2>

      <ForgotPasswordForm onBack={() => router.push('/login')} />

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <Link href="/login" className="text-primary hover:underline dark:text-dark-primary">
          Volver al inicio de sesión
        </Link>
      </p>
    </>
  );
}

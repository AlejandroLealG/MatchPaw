'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoginForm } from '../../../components/features/auth/LoginForm';
import { useAuthStore } from '../../../store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const handleSuccess = () => {
    if (user?.role === 'refugio') router.push('/refugio/dashboard');
    else if (user?.role === 'admin') router.push('/admin/dashboard');
    else router.push('/animales');
  };

  return (
    <>
      <h2 className="text-xl font-semibold text-text-base dark:text-dark-text-base mb-6">
        Iniciar sesión
      </h2>

      <LoginForm
        onSuccess={handleSuccess}
        onForgotPassword={() => router.push('/forgot-password')}
      />

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="text-primary hover:underline dark:text-dark-primary">
          Regístrate
        </Link>
      </p>
    </>
  );
}

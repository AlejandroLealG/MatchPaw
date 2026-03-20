'use client';

import { useState } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { useAuth } from '../../../hooks/useAuth';

interface LoginFormProps {
  onSuccess?: (role: string) => void;
  onForgotPassword?: () => void;
}

export function LoginForm({ onSuccess, onForgotPassword }: LoginFormProps) {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const data = await login({ email, password });
      onSuccess?.(data.user.role);
    } catch {
      // Mensaje genérico — no revelar qué campo falló (Requisito 1.4)
      setError('Correo electrónico o contraseña incorrectos');
    }
  };

  const handleGoogleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    window.location.href = `${apiUrl}/auth/google`;
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth loading={loading}>
        Iniciar sesión
      </Button>

      <Button type="button" variant="ghost" fullWidth onClick={handleGoogleLogin}>
        Continuar con Google
      </Button>

      {onForgotPassword && (
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-center text-primary hover:underline dark:text-dark-primary"
        >
          ¿Olvidaste tu contraseña?
        </button>
      )}
    </form>
  );
}

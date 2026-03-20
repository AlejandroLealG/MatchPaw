'use client';

import { useState } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

interface ForgotPasswordFormProps {
  onBack?: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('El correo es obligatorio');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? 'Error al enviar el correo');
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el correo');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-text-base dark:text-dark-text-base">
          Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.
          El enlace es válido por 60 minutos.
        </p>
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack}>
            Volver al inicio de sesión
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
      </p>

      <Input
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error ?? undefined}
        required
      />

      <Button type="submit" fullWidth loading={loading}>
        Enviar enlace
      </Button>

      {onBack && (
        <Button type="button" variant="ghost" fullWidth onClick={onBack}>
          Volver al inicio de sesión
        </Button>
      )}
    </form>
  );
}

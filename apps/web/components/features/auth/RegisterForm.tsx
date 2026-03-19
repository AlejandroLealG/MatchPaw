'use client';

import { useState } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { useAuth } from '../../../hooks/useAuth';
import type { UserRole } from '../../../store/authStore';

interface RegisterFormProps {
  onSuccess?: () => void;
}

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'adoptante', label: 'Adoptante', description: 'Quiero adoptar una mascota' },
  { value: 'refugio', label: 'Refugio / Fundación', description: 'Publico animales en adopción' },
];

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { register, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('adoptante');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!email) next.email = 'El correo es obligatorio';
    if (!password) next.password = 'La contraseña es obligatoria';
    else if (password.length < 8) next.password = 'Mínimo 8 caracteres';
    if (password !== confirmPassword) next.confirmPassword = 'Las contraseñas no coinciden';
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    try {
      await register({ email, password, role });
      onSuccess?.();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error al registrarse');
    }
  };

  const handleGoogleRegister = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    window.location.href = `${apiUrl}/auth/google`;
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Selector de rol */}
      <fieldset>
        <legend className="text-sm font-medium text-text-base dark:text-dark-text-base mb-2">
          Quiero registrarme como
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map(({ value, label, description }) => (
            <label
              key={value}
              className={[
                'flex flex-col gap-1 p-3 rounded-md border cursor-pointer transition-colors',
                role === value
                  ? 'border-primary bg-blue-50 dark:border-dark-primary dark:bg-blue-950'
                  : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500',
              ].join(' ')}
            >
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
                className="sr-only"
              />
              <span className="text-sm font-medium text-text-base dark:text-dark-text-base">
                {label}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Input
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        required
      />
      <Input
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        helperText="Mínimo 8 caracteres"
        required
      />
      <Input
        label="Confirmar contraseña"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={errors.confirmPassword}
        required
      />

      {serverError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {serverError}
        </p>
      )}

      <Button type="submit" fullWidth loading={loading}>
        Crear cuenta
      </Button>

      <Button type="button" variant="ghost" fullWidth onClick={handleGoogleRegister}>
        Registrarse con Google
      </Button>
    </form>
  );
}

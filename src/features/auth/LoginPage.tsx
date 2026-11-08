import { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, User } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Location, NavigateFunction } from 'react-router-dom';
import type { FormEvent, ReactElement } from 'react';

interface LoginLocationState {
  from?: Location;
}

interface FieldErrors {
  username?: string;
  password?: string;
}

function validate(username: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (username.trim() === '') errors.username = 'Enter your username.';
  if (password === '') errors.password = 'Enter your password.';
  return errors;
}

function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Please try again.';
}

export function LoginPage(): ReactElement {
  const { isAuthenticated, login } = useAuth();
  const navigate: NavigateFunction = useNavigate();
  const location: Location = useLocation();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const from: Location | undefined = (location.state as LoginLocationState | null)?.from;
  // Keep the query string so a deep-linked search survives the login round-trip.
  const destination: string = from ? `${from.pathname}${from.search}` : '/parts';
  if (isAuthenticated) return <Navigate to={destination} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const errors: FieldErrors = validate(username, password);
    setFieldErrors(errors);
    setSubmitError(null);
    if (errors.username || errors.password) return;

    setSubmitting(true);
    try {
      await login({ username: username.trim(), password });
      void navigate(destination, { replace: true });
    } catch (error: unknown) {
      setSubmitError(describeError(error));
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted">Log in to browse and search your parts.</p>

      <form onSubmit={(event: FormEvent<HTMLFormElement>): void => void handleSubmit(event)} noValidate className="mt-8 space-y-4">
        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {submitError}
          </div>
        )}
        <TextField
          label="Username"
          icon={<User className="size-4" aria-hidden="true" />}
          autoComplete="username"
          autoFocus
          value={username}
          onChange={(event): void => setUsername(event.target.value)}
          error={fieldErrors.username}
        />
        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          icon={<Lock className="size-4" aria-hidden="true" />}
          autoComplete="current-password"
          value={password}
          onChange={(event): void => setPassword(event.target.value)}
          error={fieldErrors.password}
          trailing={
            <Button
              variant="ghost"
              size="sm"
              className="size-8 px-0"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={(): void => setShowPassword((visible: boolean): boolean => !visible)}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          }
        />
        <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Have an invite code?{' '}
        <Link to="/register" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}

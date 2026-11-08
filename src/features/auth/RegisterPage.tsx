import { useState } from 'react';
import { AlertCircle, Eye, EyeOff, KeyRound, Lock, User } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { register } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import type { NavigateFunction } from 'react-router-dom';
import type { FormEvent, ReactElement } from 'react';

const MIN_PASSWORD_LENGTH: number = 8;
// bcrypt ignores (and the backend rejects) anything beyond 72 bytes.
const MAX_PASSWORD_BYTES: number = 72;

interface FormValues {
  firstName: string;
  surname: string;
  username: string;
  password: string;
  confirmPassword: string;
  inviteCode: string;
}

type FieldErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY_FORM: FormValues = {
  firstName: '',
  surname: '',
  username: '',
  password: '',
  confirmPassword: '',
  inviteCode: '',
};

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.username.trim() === '') errors.username = 'Choose a username.';
  if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (new TextEncoder().encode(values.password).length > MAX_PASSWORD_BYTES) {
    errors.password = `Use at most ${MAX_PASSWORD_BYTES} bytes.`;
  }
  if (values.confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match.';
  if (values.inviteCode.trim() === '') errors.inviteCode = 'Enter the invite code from your team.';
  return errors;
}

/** Maps a server rejection onto the field it is about; anything else becomes a form-level message. */
function describeFailure(error: unknown): { field?: keyof FormValues; message: string } {
  if (error instanceof ApiError) {
    if (error.status === 409) return { field: 'username', message: 'That username is already taken.' };
    if (error.status === 403) return { field: 'inviteCode', message: error.message };
    return { message: error.message };
  }
  return { message: 'Something went wrong. Please try again.' };
}

export function RegisterPage(): ReactElement {
  const { isAuthenticated, login } = useAuth();
  const navigate: NavigateFunction = useNavigate();

  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (isAuthenticated) return <Navigate to="/parts" replace />;

  function bind(key: keyof FormValues): {
    value: string;
    onChange: (event: { target: { value: string } }) => void;
    error: string | undefined;
  } {
    return {
      value: values[key],
      onChange: (event: { target: { value: string } }): void =>
        setValues((current: FormValues): FormValues => ({ ...current, [key]: event.target.value })),
      error: fieldErrors[key],
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const errors: FieldErrors = validate(values);
    setFieldErrors(errors);
    setSubmitError(null);
    if (Object.keys(errors).length > 0) return;

    const username: string = values.username.trim();
    setSubmitting(true);
    try {
      await register({
        username,
        password: values.password,
        firstName: values.firstName.trim(),
        surname: values.surname.trim(),
        inviteCode: values.inviteCode.trim(),
      });
    } catch (error: unknown) {
      const failure: ReturnType<typeof describeFailure> = describeFailure(error);
      if (failure.field) setFieldErrors({ [failure.field]: failure.message });
      else setSubmitError(failure.message);
      setSubmitting(false);
      return;
    }

    // The account exists now. If the follow-up login fails, send them to the login page
    // rather than leaving them on a form whose resubmit would hit "username taken".
    try {
      await login({ username, password: values.password });
      void navigate('/parts', { replace: true });
    } catch {
      void navigate('/login', { replace: true });
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted">You need the invite code your team shares.</p>

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
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="First name" autoComplete="given-name" autoFocus {...bind('firstName')} />
          <TextField label="Surname" autoComplete="family-name" {...bind('surname')} />
        </div>
        <TextField
          label="Username"
          icon={<User className="size-4" aria-hidden="true" />}
          autoComplete="username"
          {...bind('username')}
        />
        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          icon={<Lock className="size-4" aria-hidden="true" />}
          autoComplete="new-password"
          {...bind('password')}
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
        <TextField
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          icon={<Lock className="size-4" aria-hidden="true" />}
          autoComplete="new-password"
          {...bind('confirmPassword')}
        />
        <TextField
          label="Invite code"
          icon={<KeyRound className="size-4" aria-hidden="true" />}
          autoComplete="off"
          {...bind('inviteCode')}
        />
        <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}

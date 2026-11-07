import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useLogin } from '@/features/auth'
import { loginSchema } from '@/features/auth/schemas'
import type { LoginValues } from '@/features/auth/schemas'
import { usePageTitle } from '@/hooks/use-page-title'
import { ApiError } from '@/lib/apiClient'
import { stripBasePath } from '@/lib/base-path'

/**
 * Only same-origin paths, so ?next cannot be used as an open redirect.
 * Backslashes are rejected too: browsers normalise `/\evil.test` to a
 * protocol-relative URL even though it starts with a single slash. A path that
 * already carries the deployment base is normalised to an app-relative one so
 * the router does not prepend the basename twice.
 */
function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null
  }
  return stripBasePath(value) || '/'
}

export default function LoginPage() {
  usePageTitle('Sign in')

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const login = useLogin()
  const next = safeNext(searchParams.get('next'))

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const session = await login.mutateAsync(values)
      const target = next ?? (session.account.role === 'doctor' ? '/provider' : '/doctors')
      await navigate(target, { replace: true })
    } catch {
      // Rendered from login.error below.
    }
  })

  const emailError = form.formState.errors.email
  const passwordError = form.formState.errors.password

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-text-muted text-sm">
          Sign in as a patient or a doctor. New patients can create an account below.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <FieldGroup>
          <Field data-invalid={emailError ? true : undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={emailError ? true : undefined}
              {...form.register('email')}
            />
            <FieldError>{emailError?.message}</FieldError>
          </Field>

          <Field data-invalid={passwordError ? true : undefined}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={passwordError ? true : undefined}
              {...form.register('password')}
            />
            <FieldError>{passwordError?.message}</FieldError>
          </Field>
        </FieldGroup>

        {login.isError ? (
          <p
            role="alert"
            className="border-danger/30 bg-danger/5 text-danger rounded-md border px-3 py-2 text-sm"
          >
            {login.error instanceof ApiError ? login.error.message : 'Sign in failed.'}
          </p>
        ) : null}

        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>

        <FieldDescription>
          You will be returned to the page you were trying to reach.
        </FieldDescription>
      </form>

      <p className="text-text-muted text-center text-sm">
        New patient?{' '}
        <Link to="/auth/register" className="text-primary font-medium hover:underline">
          Create an account
        </Link>
      </p>

      {import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true' ? (
        <div className="border-border bg-surface-muted/40 text-text-muted rounded-md border px-3 py-2 text-xs">
          <p className="text-text font-medium">Demo accounts</p>
          <p className="mt-1 font-mono">nadia.okafor@example.com (patient)</p>
          <p className="font-mono">dr.amara.okafor.prv_01@doctors.example (doctor)</p>
          <p className="mt-1">
            Password: <span className="text-text font-mono">demo-password-2026</span>
          </p>
        </div>
      ) : null}
    </div>
  )
}

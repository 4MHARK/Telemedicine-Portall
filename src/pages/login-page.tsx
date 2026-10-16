import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useLogin } from '@/features/auth'
import { usePageTitle } from '@/hooks/use-page-title'
import { ApiError } from '@/lib/apiClient'

/**
 * docs/api-contract.md: "any non-empty credentials succeed", and the only
 * failure is 401 INVALID_CREDENTIALS. The schema therefore checks presence
 * rather than shape — requiring an email format would reject input the mock
 * API accepts.
 */
const loginSchema = z.object({
  email: z.string().min(1, 'Enter your email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

type LoginValues = z.infer<typeof loginSchema>

/** Only same-origin paths, so ?next cannot be used as an open redirect. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/doctors'
  return value
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
      await login.mutateAsync(values)
      await navigate(next, { replace: true })
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
          Mock authentication — any non-empty credentials work.
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
    </div>
  )
}

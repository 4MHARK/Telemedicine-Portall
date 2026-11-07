import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useRegister } from '@/features/auth'
import { registerSchema } from '@/features/auth/schemas'
import type { RegisterValues } from '@/features/auth/schemas'
import { usePageTitle } from '@/hooks/use-page-title'
import { ApiError } from '@/lib/apiClient'

export default function SignupPage() {
  usePageTitle('Create an account')

  const navigate = useNavigate()
  const register = useRegister()

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await register.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        dateOfBirth: values.dateOfBirth,
        password: values.password,
      })
      await navigate('/doctors', { replace: true })
    } catch {
      // Rendered from register.error below.
    }
  })

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create a patient account</h1>
        <p className="text-text-muted text-sm">
          Book appointments, upload documents, and message your doctor.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={form.formState.errors.firstName ? true : undefined}>
              <FieldLabel htmlFor="firstName">First name</FieldLabel>
              <Input id="firstName" autoComplete="given-name" {...form.register('firstName')} />
              <FieldError>{form.formState.errors.firstName?.message}</FieldError>
            </Field>

            <Field data-invalid={form.formState.errors.lastName ? true : undefined}>
              <FieldLabel htmlFor="lastName">Last name</FieldLabel>
              <Input id="lastName" autoComplete="family-name" {...form.register('lastName')} />
              <FieldError>{form.formState.errors.lastName?.message}</FieldError>
            </Field>
          </div>

          <Field data-invalid={form.formState.errors.email ? true : undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
            <FieldError>{form.formState.errors.email?.message}</FieldError>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={form.formState.errors.phone ? true : undefined}>
              <FieldLabel htmlFor="phone">Phone</FieldLabel>
              <Input id="phone" type="tel" autoComplete="tel" {...form.register('phone')} />
              <FieldError>{form.formState.errors.phone?.message}</FieldError>
            </Field>

            <Field data-invalid={form.formState.errors.dateOfBirth ? true : undefined}>
              <FieldLabel htmlFor="dateOfBirth">Date of birth</FieldLabel>
              <Input id="dateOfBirth" type="date" {...form.register('dateOfBirth')} />
              <FieldError>{form.formState.errors.dateOfBirth?.message}</FieldError>
            </Field>
          </div>

          <Field data-invalid={form.formState.errors.password ? true : undefined}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
            <FieldError>{form.formState.errors.password?.message}</FieldError>
          </Field>

          <Field data-invalid={form.formState.errors.confirmPassword ? true : undefined}>
            <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...form.register('confirmPassword')}
            />
            <FieldError>{form.formState.errors.confirmPassword?.message}</FieldError>
          </Field>
        </FieldGroup>

        {register.isError ? (
          <p
            role="alert"
            className="border-danger/30 bg-danger/5 text-danger rounded-md border px-3 py-2 text-sm"
          >
            {register.error instanceof ApiError
              ? register.error.message
              : 'Account creation failed.'}
          </p>
        ) : null}

        <Button type="submit" disabled={register.isPending}>
          {register.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-text-muted text-center text-sm">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}

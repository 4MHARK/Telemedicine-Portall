import { z } from 'zod'

/**
 * Form schemas. docs/decisions.md row 1: zod owns form types only — entity
 * types stay hand-written in src/types.
 *
 * docs/api-contract.md: "any non-empty credentials succeed", and the only
 * failure the mock returns is 401 INVALID_CREDENTIALS. The schema therefore
 * checks presence rather than shape; an email-format rule would reject input
 * the API accepts.
 */
export const loginSchema = z.object({
  email: z.string().min(1, 'Enter your email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Enter your first name.').max(80),
    lastName: z.string().trim().min(1, 'Enter your last name.').max(80),
    email: z
      .string()
      .trim()
      .min(1, 'Enter your email address.')
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'),
    phone: z.string().trim().min(1, 'Enter your phone number.').max(30),
    dateOfBirth: z.string().min(1, 'Enter your date of birth.'),
    password: z.string().min(12, 'Use at least 12 characters.').max(128),
    confirmPassword: z.string().min(1, 'Repeat your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export type RegisterValues = z.infer<typeof registerSchema>

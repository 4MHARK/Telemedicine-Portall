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

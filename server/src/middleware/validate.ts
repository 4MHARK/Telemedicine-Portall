import type { Request } from 'express'
import { z } from 'zod'

import { badRequest } from '../lib/http.js'

function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const flattened = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>
  const out: Record<string, string[]> = {}

  for (const [field, messages] of Object.entries(flattened)) {
    if (messages && messages.length > 0) out[field] = messages
  }

  return out
}

export function parseBody<T extends z.ZodType>(schema: T, req: Request): z.infer<T> {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    throw badRequest('Request body failed schema validation.', toFieldErrors(result.error))
  }
  return result.data
}

export function parseQuery<T extends z.ZodType>(schema: T, req: Request): z.infer<T> {
  const result = schema.safeParse(req.query)
  if (!result.success) {
    throw badRequest('Query parameters are invalid.', toFieldErrors(result.error))
  }
  return result.data
}

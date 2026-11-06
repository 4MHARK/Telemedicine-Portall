import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { AppError } from '../lib/http.js'

interface ErrorBody {
  code: string
  message: string
  fieldErrors?: Record<string, string[]>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function zodFieldErrors(error: ZodError): Record<string, string[]> {
  const flattened = error.flatten().fieldErrors
  const out: Record<string, string[]> = {}
  for (const [field, messages] of Object.entries(flattened)) {
    if (messages && messages.length > 0) out[field] = messages
  }
  return out
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'NOT_FOUND', 'Route not found.'))
}

/**
 * The single exit for every failure. It always emits the frontend's
 * ApiErrorBody shape: { code, message, fieldErrors? }.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error)
    return
  }

  let status = 500
  let code = 'INTERNAL'
  let message = 'Something went wrong.'
  let fieldErrors: Record<string, string[]> | undefined

  if (error instanceof AppError) {
    status = error.status
    code = error.code
    message = error.message
    fieldErrors = error.fieldErrors
  } else if (error instanceof ZodError) {
    status = 422
    code = 'VALIDATION'
    message = 'Request body failed schema validation.'
    fieldErrors = zodFieldErrors(error)
  } else if (error instanceof Error && error.name === 'MulterError') {
    const multerCode = isRecord(error) && typeof error.code === 'string' ? error.code : ''
    if (multerCode === 'LIMIT_FILE_SIZE') {
      status = 413
      code = 'FILE_TOO_LARGE'
      message = 'Files must be 10 MB or smaller.'
    } else {
      status = 422
      code = 'VALIDATION'
      message = 'The upload could not be read.'
      fieldErrors = { file: [error.message] }
    }
  } else if (isRecord(error) && error.type === 'entity.too.large') {
    status = 413
    code = 'FILE_TOO_LARGE'
    message = 'Request body is too large.'
  } else if (
    error instanceof SyntaxError &&
    isRecord(error) &&
    error.type === 'entity.parse.failed'
  ) {
    status = 422
    code = 'VALIDATION'
    message = 'Request body must be valid JSON.'
  } else if (error instanceof Error && error.name === 'PrismaClientKnownRequestError') {
    const prismaCode = isRecord(error) && typeof error.code === 'string' ? error.code : ''
    if (prismaCode === 'P2025') {
      status = 404
      code = 'NOT_FOUND'
      message = 'Resource not found.'
    } else if (prismaCode === 'P2002') {
      status = 409
      code = 'VALIDATION'
      message = 'A unique constraint was violated.'
    } else if (prismaCode === 'P2003') {
      status = 409
      code = 'VALIDATION'
      message = 'A related record is missing.'
    }
  }

  if (status >= 500) {
    console.error(error)
  }

  const body: ErrorBody = fieldErrors ? { code, message, fieldErrors } : { code, message }
  res.status(status).json(body)
}

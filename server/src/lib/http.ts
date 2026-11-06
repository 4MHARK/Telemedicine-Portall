import type { NextFunction, Request, Response } from 'express'

/**
 * Every failure the API reports is an AppError. The error middleware turns it
 * into the ApiErrorBody shape the frontend already parses:
 *
 *   { code, message, fieldErrors? }
 */
export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors?: Record<string, string[]>

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export const badRequest = (message: string, fieldErrors?: Record<string, string[]>) =>
  new AppError(422, 'VALIDATION', message, fieldErrors)

export const unauthorized = (message = 'Missing, invalid or expired token.') =>
  new AppError(401, 'UNAUTHORIZED', message)

export const forbidden = (message = 'You do not have access to this resource.') =>
  new AppError(403, 'FORBIDDEN', message)

export const notFound = (message = 'Resource not found.') => new AppError(404, 'NOT_FOUND', message)

export const conflict = (code: string, message: string) => new AppError(409, code, message)

/**
 * Express 5 forwards rejected promises to the error middleware, but wrapping
 * every handler keeps the funnel explicit and survives a downgrade.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    void handler(req, res, next).catch(next)
  }
}

/** Express 5 types route params as string | string[]. Normalize to one value. */
export function routeParam(req: Request, name: string): string {
  const value = req.params[name]
  return typeof value === 'string' ? value : ''
}

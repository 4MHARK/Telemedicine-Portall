/** Client-side upload constraints, mirroring docs/api-contract.md's limits. */
export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const
export const MAX_BYTES = 10 * 1024 * 1024
/** Not specified in docs/; capped so one drop cannot flood the queue. */
export const MAX_FILES = 10

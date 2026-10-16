// ─────────────────────────────────────────────────────────────
// Domain model · common
//
// Conventions (from docs/domain.ts)
//   ISODateString : ISO 8601 UTC, e.g. "2025-03-14T09:30:00.000Z"
//   IDs           : opaque strings in transit; branded at the edge if needed
//   Enums         : string unions, never TS `enum`
//   Optionality   : use `field?: T` only when the server may omit it entirely;
//                   use `field: T | null` when the server returns null explicitly
// ─────────────────────────────────────────────────────────────

export type ISODateString = string
export type UUID = string

// ── Envelopes ────────────────────────────────────────────────

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  hasNext: boolean
}

export interface ApiErrorBody {
  code: string // "NOT_FOUND" | "VALIDATION" | "UNAUTHORIZED" | ...
  message: string
  fieldErrors?: Record<string, string[]>
}

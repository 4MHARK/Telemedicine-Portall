// ─────────────────────────────────────────────────────────────
// Domain model · document
// ─────────────────────────────────────────────────────────────

import type { ISODateString, UUID } from './common'

export type DocumentStatus = 'queued' | 'uploading' | 'uploaded' | 'failed'

export interface Document {
  id: UUID
  patientId: UUID
  appointmentId?: UUID
  fileName: string
  mimeType: string
  sizeBytes: number
  status: DocumentStatus
  uploadedAt: ISODateString | null
  failureReason?: string
}

/**
 * Client-only. Tracks a file through the upload queue.
 * Lives in Context + Reducer — never in TanStack Query.
 * Holds the File reference so retry can re-attempt without re-selection.
 */
export interface UploadTask {
  id: UUID // locally generated
  fileName: string
  mimeType: string
  sizeBytes: number
  progress: number // 0–100
  status: DocumentStatus
  documentId?: UUID // set on success
  failureReason?: string
  file: File
}

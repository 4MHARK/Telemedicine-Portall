/**
 * Upload transport.
 *
 * docs/decisions.md row 6: XHR, not fetch, because fetch cannot report upload
 * progress. Row 8: MSW cannot emit real upload.onprogress events, so in DEV
 * the wrapper emits synthetic ticks on a timer while the request is in flight.
 */

import { ApiError } from '@/lib/apiClient'
import type { ApiErrorBody, Document } from '@/types'

export interface UploadProgress {
  url: string
  file: File
  token?: string | null
  appointmentId?: string
  onProgress?: (percent: number) => void
}

/** Rate of the DEV-only progress ticks, in ms. */
const SYNTHETIC_TICK_MS = 120

function parseBody(raw: string): Partial<ApiErrorBody> & Partial<Document> {
  try {
    return JSON.parse(raw) as Partial<ApiErrorBody> & Partial<Document>
  } catch {
    return {}
  }
}

export function uploadWithXhr({
  url,
  file,
  token,
  appointmentId,
  onProgress,
}: UploadProgress): Promise<Document> {
  return new Promise<Document>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    // Real progress where the browser reports it.
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.((event.loaded / event.total) * 100)
    }

    // DEV: synthetic ticks, because MSW holds the response until the handler
    // finishes and there is no real transfer to observe.
    let synthetic: ReturnType<typeof setInterval> | null = null
    if (import.meta.env.DEV && onProgress) {
      let tick = 0
      synthetic = setInterval(() => {
        tick = Math.min(90, tick + 10)
        onProgress(tick)
      }, SYNTHETIC_TICK_MS)
    }

    const stopSynthetic = () => {
      if (synthetic !== null) {
        clearInterval(synthetic)
        synthetic = null
      }
    }

    xhr.onload = () => {
      stopSynthetic()
      const body = parseBody(xhr.responseText)

      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve(body as Document)
        return
      }

      reject(
        new ApiError(
          xhr.status,
          typeof body.code === 'string' ? body.code : 'INTERNAL',
          typeof body.message === 'string' ? body.message : 'The upload failed.',
          body.fieldErrors,
        ),
      )
    }

    xhr.onerror = () => {
      stopSynthetic()
      reject(new ApiError(0, 'INTERNAL', 'The upload could not reach the server.'))
    }

    xhr.onabort = () => {
      stopSynthetic()
      reject(new ApiError(0, 'INTERNAL', 'The upload was cancelled.'))
    }

    const form = new FormData()
    form.append('file', file)
    if (appointmentId) form.append('appointmentId', appointmentId)

    xhr.send(form)
  })
}

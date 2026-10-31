import { FileText, Upload } from 'lucide-react'
import { useRef } from 'react'
import type { ChangeEvent } from 'react'

import { LoadingSkeleton } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDocuments } from '@/features/documents/queries'
import { UploadItem } from '@/features/documents/UploadItem'
import { useUpload } from '@/features/documents/upload-context'
import { ALLOWED_MIME_TYPES, MAX_BYTES } from '@/features/documents/upload-limits'
import { ApiError } from '@/lib/apiClient'
import { formatBytes, formatDateTime } from '@/lib/format'
import type { Appointment, Document } from '@/types'

const STATUS_LABEL: Record<Document['status'], string> = {
  queued: 'Queued',
  uploading: 'Uploading',
  uploaded: 'Shared',
  failed: 'Failed',
}

/** Documents explicitly attached to one visit, plus its live upload queue. */
export function AppointmentDocuments({ appointment }: { appointment: Appointment }) {
  const documents = useDocuments()
  const { tasks, enqueue, retry, remove } = useUpload()
  const inputRef = useRef<HTMLInputElement>(null)
  const canUpload = appointment.status === 'scheduled'

  const linkedDocuments = (documents.data ?? []).filter(
    (doc) => doc.appointmentId === appointment.id,
  )
  const linkedIds = new Set(linkedDocuments.map((doc) => doc.id))

  // A task stays visible until the invalidated list contains its document, so
  // the row never disappears during the refetch.
  const activeTasks = tasks.filter(
    (task) =>
      task.appointmentId === appointment.id &&
      (task.status !== 'uploaded' || !task.documentId || !linkedIds.has(task.documentId)),
  )

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : []
    if (files.length > 0) enqueue(files, { appointmentId: appointment.id })
    // Reset so choosing the same file again still fires onChange.
    event.target.value = ''
  }

  return (
    <section
      aria-label="Documents for this visit"
      className="border-border rounded-lg border p-4"
      data-slot="appointment-documents"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-medium">
            <FileText className="size-4" aria-hidden="true" />
            Documents for this visit
          </h2>
          <p className="text-text-muted mt-1 text-sm">
            Share scans, reports, or images with your provider.
          </p>
        </div>

        {canUpload ? (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ALLOWED_MIME_TYPES.join(',')}
              className="sr-only"
              tabIndex={-1}
              aria-label="Upload documents for this appointment"
              onChange={handleFiles}
            />
            <Button variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" aria-hidden="true" />
              Upload document
            </Button>
          </>
        ) : null}
      </div>

      {canUpload ? (
        <p className="text-text-subtle mt-2 text-xs">
          PDF, PNG or JPEG · up to {MAX_BYTES / (1024 * 1024)} MB each
        </p>
      ) : (
        <p className="text-text-muted mt-2 text-sm">
          This visit is closed. Documents remain below for your records.
        </p>
      )}

      {documents.isPending ? (
        <LoadingSkeleton variant="list" count={2} className="mt-3" />
      ) : documents.isError ? (
        <div role="alert" className="text-danger mt-3 flex flex-col gap-2 text-sm">
          <p>
            {documents.error instanceof ApiError
              ? documents.error.message
              : 'Documents are unavailable right now.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => void documents.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : linkedDocuments.length === 0 && activeTasks.length === 0 ? (
        <p className="text-text-muted mt-3 text-sm">No documents shared for this visit yet.</p>
      ) : (
        <ul className="mt-3 flex list-none flex-col gap-2 p-0">
          {activeTasks.map((task) => (
            <UploadItem key={task.id} task={task} onRetry={retry} onRemove={remove} />
          ))}

          {linkedDocuments.map((doc) => (
            <li
              key={doc.id}
              className="border-border flex items-center gap-3 rounded-md border px-3 py-2"
              data-slot="appointment-document"
            >
              <FileText className="text-text-muted size-4 shrink-0" aria-hidden="true" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm">{doc.fileName}</span>
                <span className="text-text-muted text-xs">
                  {formatBytes(doc.sizeBytes)} ·{' '}
                  {doc.uploadedAt ? formatDateTime(doc.uploadedAt) : 'Not uploaded'}
                </span>
              </div>
              <Badge variant={doc.status === 'uploaded' ? 'secondary' : 'destructive'}>
                {STATUS_LABEL[doc.status]}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

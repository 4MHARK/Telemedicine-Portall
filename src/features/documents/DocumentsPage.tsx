import { FileText, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import {
  AsyncStatus,
  ConfirmDialog,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
} from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAppointments } from '@/features/appointments/queries'
import { useProviders } from '@/features/providers'
import { usePageTitle } from '@/hooks/use-page-title'
import { ApiError } from '@/lib/apiClient'
import { formatBytes, formatDateTime } from '@/lib/format'
import type { DocumentStatus } from '@/types'
import { DropZone } from './DropZone'
import { useDeleteDocument, useDocuments } from './queries'
import { UploadItem } from './UploadItem'
import { useUpload } from './upload-context'

const STATUS_VARIANT: Record<DocumentStatus, 'default' | 'secondary' | 'outline' | 'destructive'> =
  {
    queued: 'outline',
    uploading: 'outline',
    uploaded: 'secondary',
    failed: 'destructive',
  }

const STATUS_LABEL: Record<DocumentStatus, string> = {
  queued: 'Queued',
  uploading: 'Uploading',
  uploaded: 'Uploaded',
  failed: 'Failed',
}

export default function DocumentsPage() {
  usePageTitle('Documents')

  const documents = useDocuments()
  const removeDocument = useDeleteDocument()
  const { tasks, enqueue, retry, remove, clearCompleted } = useUpload()
  const appointments = useAppointments()
  const directory = useProviders({ pageSize: 50 })
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')

  const completed = tasks.filter((task) => task.status === 'uploaded').length

  const appointmentById = new Map((appointments.data ?? []).map((a) => [a.id, a]))
  const providersById = new Map((directory.data?.items ?? []).map((p) => [p.id, p]))
  const scheduledAppointments = (appointments.data ?? [])
    .filter((appointment) => appointment.status === 'scheduled')
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))

  function providerName(providerId: string): string {
    const provider = providersById.get(providerId)
    return provider ? `${provider.title} ${provider.firstName} ${provider.lastName}` : 'Provider'
  }

  return (
    <>
      <PageHeader title="Documents" description="Upload records to share with your provider." />

      <div className="grid max-w-4xl gap-8">
        <section aria-label="Upload documents" className="flex flex-col gap-3">
          <div className="flex max-w-md flex-col gap-1.5">
            <label htmlFor="document-appointment" className="text-text-muted text-xs font-medium">
              Share with
            </label>
            <select
              id="document-appointment"
              value={selectedAppointmentId}
              onChange={(event) => setSelectedAppointmentId(event.target.value)}
              aria-describedby="document-appointment-hint"
              className="border-input bg-surface focus-visible:border-ring rounded-md border px-3 py-2 text-sm outline-none"
            >
              <option value="">Personal record (no appointment)</option>
              {scheduledAppointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {providerName(appointment.providerId)} — {formatDateTime(appointment.scheduledAt)}
                </option>
              ))}
            </select>
            <p id="document-appointment-hint" className="text-text-subtle text-xs">
              {appointments.isPending
                ? 'Loading your appointments…'
                : appointments.isError
                  ? 'Could not load appointments. You can still upload a personal record.'
                  : scheduledAppointments.length > 0
                    ? 'Choose a scheduled visit to share the upload with that provider.'
                    : 'Book an appointment to share documents with a provider.'}
            </p>
          </div>

          <DropZone
            onFiles={(files) =>
              enqueue(files, { appointmentId: selectedAppointmentId || undefined })
            }
          />

          {tasks.length > 0 ? (
            <div className="border-border rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium">Uploads ({tasks.length})</h2>
                {completed > 0 ? (
                  <Button variant="ghost" size="sm" onClick={clearCompleted}>
                    Clear completed
                  </Button>
                ) : null}
              </div>
              <ul className="mt-2 flex list-none flex-col divide-y p-0">
                {tasks.map((task) => (
                  <UploadItem key={task.id} task={task} onRetry={retry} onRemove={remove} />
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section aria-label="Your documents" className="flex flex-col gap-3">
          <h2 className="font-medium">Your documents</h2>

          <AsyncStatus
            query={documents}
            skeleton={<LoadingSkeleton variant="list" count={4} />}
            errorTitle="Could not load documents"
            errorFallback="Documents are unavailable right now."
            isEmpty={(data) => data.length === 0}
            empty={
              <EmptyState
                icon={FileText}
                title="No documents yet"
                description="Upload a PDF or image and it will appear here."
                action={
                  <Button variant="outline" nativeButton={false} render={<Link to="/messages" />}>
                    Message your provider
                  </Button>
                }
              />
            }
          >
            {(data) => (
              <ul className="flex list-none flex-col gap-2 p-0">
                {data.map((document) => {
                  const appointment = document.appointmentId
                    ? appointmentById.get(document.appointmentId)
                    : undefined
                  const association = document.appointmentId
                    ? appointment
                      ? `For ${providerName(appointment.providerId)} · ${formatDateTime(appointment.scheduledAt)}`
                      : 'Linked to a visit'
                    : 'Personal record'

                  return (
                    <li
                      key={document.id}
                      className="border-border flex items-center gap-3 rounded-lg border p-3"
                      data-slot="document-row"
                    >
                      <FileText className="text-text-muted size-4 shrink-0" aria-hidden="true" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm">{document.fileName}</span>
                        <span className="text-text-muted text-xs">
                          {formatBytes(document.sizeBytes)} ·{' '}
                          {document.uploadedAt
                            ? formatDateTime(document.uploadedAt)
                            : 'Not uploaded'}
                        </span>
                        <span className="text-text-subtle text-xs">{association}</span>
                      </div>
                      <Badge variant={STATUS_VARIANT[document.status]}>
                        {STATUS_LABEL[document.status]}
                      </Badge>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${document.fileName}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        }
                        title="Delete this document?"
                        description={`${document.fileName} will be removed permanently.`}
                        confirmLabel="Delete"
                        destructive
                        isPending={removeDocument.isPending}
                        onConfirm={() => removeDocument.mutate(document.id)}
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </AsyncStatus>

          {removeDocument.isError ? (
            <p role="alert" className="text-danger text-sm">
              {removeDocument.error instanceof ApiError
                ? removeDocument.error.message
                : 'The document could not be deleted.'}
            </p>
          ) : null}
        </section>
      </div>
    </>
  )
}

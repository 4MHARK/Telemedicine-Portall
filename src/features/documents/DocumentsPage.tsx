import { FileText, Trash2 } from 'lucide-react'
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

export default function DocumentsPage() {
  usePageTitle('Documents')

  const documents = useDocuments()
  const removeDocument = useDeleteDocument()
  const { tasks, enqueue, retry, remove, clearCompleted } = useUpload()

  const completed = tasks.filter((task) => task.status === 'uploaded').length

  return (
    <>
      <PageHeader title="Documents" description="Upload records to share with your provider." />

      <div className="grid max-w-4xl gap-8">
        <section aria-label="Upload documents" className="flex flex-col gap-3">
          <DropZone onFiles={enqueue} />

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
                {data.map((document) => (
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
                        {document.uploadedAt ? formatDateTime(document.uploadedAt) : 'Not uploaded'}
                      </span>
                    </div>
                    <Badge variant={STATUS_VARIANT[document.status]}>{document.status}</Badge>
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
                ))}
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

import { AlertCircle, CheckCircle2, RotateCw, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/format'
import type { UploadTask } from '@/types'

const STATUS_LABEL: Record<UploadTask['status'], string> = {
  queued: 'Queued',
  uploading: 'Uploading',
  uploaded: 'Uploaded',
  failed: 'Failed',
}

export function UploadItem({
  task,
  onRetry,
  onRemove,
}: {
  task: UploadTask
  onRetry: (id: string) => void
  onRemove: (id: string) => void
}) {
  const busy = task.status === 'uploading' || task.status === 'queued'
  const failed = task.status === 'failed'

  return (
    <li className="flex items-center gap-3 py-2" data-slot="upload-item">
      <span className="shrink-0" aria-hidden="true">
        {task.status === 'uploaded' ? (
          <CheckCircle2 className="text-success size-4" />
        ) : failed ? (
          <AlertCircle className="text-danger size-4" />
        ) : (
          <RotateCw className="text-text-muted size-4 animate-spin" />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm">{task.fileName}</span>
          <span className="text-text-muted shrink-0 text-xs">{formatBytes(task.sizeBytes)}</span>
        </div>

        {busy ? (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={task.progress}
            aria-label={`Uploading ${task.fileName}`}
            className="bg-surface-muted h-1.5 overflow-hidden rounded-full"
          >
            <div
              className="bg-primary h-full transition-[width]"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        ) : null}

        <p className={failed ? 'text-danger text-xs' : 'text-text-muted text-xs'}>
          {failed ? task.failureReason : STATUS_LABEL[task.status]}
          {task.status === 'uploading' ? ` — ${task.progress}%` : ''}
        </p>
      </div>

      {failed ? (
        <Button variant="outline" size="sm" onClick={() => onRetry(task.id)}>
          Retry
        </Button>
      ) : null}

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onRemove(task.id)}
        aria-label={`Remove ${task.fileName}`}
      >
        <X className="size-4" />
      </Button>
    </li>
  )
}

import { UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import type { DragEvent } from 'react'

import { cn } from '@/lib/utils'
import { ALLOWED_MIME_TYPES, MAX_BYTES } from './upload-limits'

export function DropZone({ onFiles }: { onFiles: (files: readonly File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  // Drag depth in a ref: dragenter/dragleave fire per child, so a counter is
  // needed to avoid flicker, but nothing reads it during render.
  const dragDepth = useRef(0)

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) onFiles(files)
  }

  return (
    <div
      data-slot="drop-zone"
      onDragEnter={(event) => {
        event.preventDefault()
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault()
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragging(false)
      }}
      onDrop={handleDrop}
      className={cn(
        'border-border bg-surface-muted/40 flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center transition-colors',
        dragging && 'border-primary bg-primary/5',
      )}
    >
      <span className="bg-surface text-text-muted rounded-full p-3" aria-hidden="true">
        <UploadCloud className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-medium">Drop files here</p>
        <p className="text-text-muted text-sm">PDF, PNG or JPEG · up to 10 MB each</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_MIME_TYPES.join(',')}
        className="sr-only"
        aria-label="Choose files to upload"
        onChange={(event) => {
          const files = event.target.files ? Array.from(event.target.files) : []
          if (files.length > 0) onFiles(files)
          // Reset so choosing the same file again still fires onChange.
          event.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="bg-primary text-primary-fg rounded-md px-3 py-1.5 text-sm"
      >
        Choose files
      </button>
      <p className="text-text-subtle text-xs">Maximum {MAX_BYTES / (1024 * 1024)} MB per file</p>
    </div>
  )
}

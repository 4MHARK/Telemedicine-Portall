import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'

import { API_BASE_URL, ApiError } from '@/lib/apiClient'
import { queryKeys } from '@/lib/queryKeys'
import { readToken } from '@/lib/session'
import type { UploadTask } from '@/types'
import { initialUploadState, uploadReducer } from './reducer'
import { UploadContext } from './upload-context'
import type { UploadContextValue } from './upload-context'
import { ALLOWED_MIME_TYPES, MAX_BYTES, MAX_FILES } from './upload-limits'
import { uploadWithXhr } from './xhr'

function makeTask(file: File): UploadTask {
  return {
    id: crypto.randomUUID(),
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    progress: 0,
    status: 'queued',
    file,
  }
}

function rejectionFor(file: File, index: number): string | null {
  if (index >= MAX_FILES) return `Up to ${MAX_FILES} files at a time.`
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'Only PDF, PNG and JPEG files are supported.'
  }
  if (file.size > MAX_BYTES) return 'Files must be 10 MB or smaller.'
  return null
}

/**
 * The upload queue lives above the page so leaving /documents mid-upload does
 * not abandon the tasks. Progress is Context + Reducer, per decisions.md row 7.
 */
export function UploadProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(uploadReducer, initialUploadState)
  const queryClient = useQueryClient()

  const run = useCallback(
    async (task: UploadTask) => {
      dispatch({ type: 'START', id: task.id })
      try {
        const document = await uploadWithXhr({
          url: `${API_BASE_URL}/documents`,
          file: task.file,
          token: readToken(),
          onProgress: (percent) => dispatch({ type: 'PROGRESS', id: task.id, progress: percent }),
        })
        dispatch({ type: 'SUCCESS', id: task.id, documentId: document.id })
        void queryClient.invalidateQueries({ queryKey: queryKeys.documents.list })
      } catch (error) {
        dispatch({
          type: 'FAIL',
          id: task.id,
          reason: error instanceof ApiError ? error.message : 'The upload failed.',
        })
      }
    },
    [queryClient],
  )

  const enqueue = useCallback(
    (files: FileList | readonly File[]) => {
      const list = Array.from(files)
      const accepted: UploadTask[] = []

      list.forEach((file, index) => {
        const task = makeTask(file)
        const rejection = rejectionFor(file, index)
        if (rejection) {
          dispatch({
            type: 'ENQUEUE',
            task: { ...task, status: 'failed', failureReason: rejection },
          })
        } else {
          dispatch({ type: 'ENQUEUE', task })
          accepted.push(task)
        }
      })

      for (const task of accepted) void run(task)
    },
    [run],
  )

  const retry = useCallback(
    (id: string) => {
      const task = state.tasks.find((candidate) => candidate.id === id)
      if (!task || task.status !== 'failed') return
      dispatch({ type: 'RETRY', id })
      void run(task)
    },
    [run, state.tasks],
  )

  const remove = useCallback((id: string) => dispatch({ type: 'REMOVE', id }), [])
  const clearCompleted = useCallback(() => dispatch({ type: 'CLEAR_COMPLETED' }), [])

  const value = useMemo<UploadContextValue>(
    () => ({ tasks: state.tasks, enqueue, retry, remove, clearCompleted }),
    [state.tasks, enqueue, retry, remove, clearCompleted],
  )

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
}

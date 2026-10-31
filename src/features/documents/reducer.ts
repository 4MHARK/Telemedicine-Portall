// Keeps File refs so retry doesn't make the user pick the file again.
import type { UploadTask } from '@/types'

export interface UploadState {
  tasks: UploadTask[]
}

export const initialUploadState: UploadState = { tasks: [] }

export type UploadAction =
  | { type: 'ENQUEUE'; task: UploadTask }
  | { type: 'START'; id: string }
  | { type: 'PROGRESS'; id: string; progress: number }
  | { type: 'SUCCESS'; id: string; documentId: string }
  | { type: 'FAIL'; id: string; reason: string }
  | { type: 'RETRY'; id: string }
  | { type: 'REMOVE'; id: string }
  | { type: 'CLEAR_COMPLETED' }

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0
  return Math.min(100, Math.max(0, Math.round(progress)))
}

function patch(
  state: UploadState,
  id: string,
  update: (task: UploadTask) => UploadTask,
): UploadState {
  return { tasks: state.tasks.map((task) => (task.id === id ? update(task) : task)) }
}

export function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case 'ENQUEUE':
      return { tasks: [...state.tasks, action.task] }

    case 'START':
      return patch(state, action.id, (task) => ({
        ...task,
        status: 'uploading',
        progress: 0,
        failureReason: undefined,
      }))

    case 'PROGRESS':
      return patch(state, action.id, (task) =>
        task.status === 'uploading' ? { ...task, progress: clampProgress(action.progress) } : task,
      )

    case 'SUCCESS':
      return patch(state, action.id, (task) => ({
        ...task,
        status: 'uploaded',
        progress: 100,
        documentId: action.documentId,
        failureReason: undefined,
      }))

    case 'FAIL':
      return patch(state, action.id, (task) => ({
        ...task,
        status: 'failed',
        failureReason: action.reason,
      }))

    case 'RETRY':
      return patch(state, action.id, (task) =>
        task.status === 'failed'
          ? { ...task, status: 'queued', progress: 0, failureReason: undefined }
          : task,
      )

    case 'REMOVE':
      return { tasks: state.tasks.filter((task) => task.id !== action.id) }

    case 'CLEAR_COMPLETED':
      return { tasks: state.tasks.filter((task) => task.status !== 'uploaded') }
  }
}

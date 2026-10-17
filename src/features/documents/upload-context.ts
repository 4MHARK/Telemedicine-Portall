import { createContext, useContext } from 'react'

import type { UploadTask } from '@/types'

export interface UploadContextValue {
  tasks: UploadTask[]
  enqueue: (files: FileList | readonly File[]) => void
  retry: (id: string) => void
  remove: (id: string) => void
  clearCompleted: () => void
}

export const UploadContext = createContext<UploadContextValue | null>(null)

export function useUpload(): UploadContextValue {
  const context = useContext(UploadContext)
  if (!context) {
    throw new Error('useUpload must be used within an <UploadProvider>')
  }
  return context
}

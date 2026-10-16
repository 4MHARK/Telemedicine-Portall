import { apiClient } from '@/lib/apiClient'
import type { Document } from '@/types'

export function fetchDocuments(): Promise<Document[]> {
  return apiClient.get<Document[]>('/documents')
}

export function deleteDocument(documentId: string): Promise<void> {
  return apiClient.delete<void>(`/documents/${documentId}`)
}

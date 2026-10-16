import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import { deleteDocument, fetchDocuments } from './api'

export function useDocuments() {
  return useQuery({
    queryKey: queryKeys.documents.list,
    queryFn: fetchDocuments,
  })
}

/**
 * docs/state-matrix.md, Invalidation Rules: delete -> documents.list.
 *
 * Upload is absent on purpose — rows 6-8 give the upload transport to XHR with
 * progress in Context + Reducer, and that arrives in Phase 3.
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.list })
    },
  })
}

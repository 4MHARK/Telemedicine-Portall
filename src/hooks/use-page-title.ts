import { useHead } from '@unhead/react'

const SUFFIX = 'Telemedicine Portal'

/**
 * Page title for the document head, via the Unhead provider in the app tree.
 * Every route calls this so the browser tab matches where the patient is.
 */
export function usePageTitle(title: string): void {
  useHead({ title: `${title} · ${SUFFIX}` })
}

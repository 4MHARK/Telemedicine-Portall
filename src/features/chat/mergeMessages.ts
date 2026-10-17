import type { ChatMessage } from '@/types'

/**
 * docs/api-contract.md, merge rule: merge by `ChatMessage.id`, never replace.
 * Server messages win; a local message with no server twin is preserved, which
 * is what keeps an optimistic send from being wiped by the next poll
 * (docs/decisions.md row 10).
 *
 * Ordering is by sentAt, with the id as a tiebreak so equal timestamps do not
 * reshuffle between polls.
 */
export function mergeMessages(
  current: readonly ChatMessage[],
  incoming: readonly ChatMessage[],
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>()

  for (const message of current) byId.set(message.id, message)
  for (const message of incoming) {
    const existing = byId.get(message.id)
    byId.set(message.id, existing ? { ...existing, ...message } : message)
  }

  return [...byId.values()].sort((a, b) => {
    const delta = Date.parse(a.sentAt) - Date.parse(b.sentAt)
    return delta !== 0 ? delta : a.id.localeCompare(b.id)
  })
}

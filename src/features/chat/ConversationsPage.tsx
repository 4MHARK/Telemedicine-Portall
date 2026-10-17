import { MessageSquare } from 'lucide-react'

import { EmptyState, PageHeader } from '@/components/shared'
import { usePageTitle } from '@/hooks/use-page-title'
import { ConversationList } from './ConversationList'

/** docs/routes.md: /messages. Two-pane from lg up; the thread is its own route. */
export default function ConversationsPage() {
  usePageTitle('Messages')

  return (
    <>
      <PageHeader title="Messages" description="Your conversations with providers." />

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <div className="border-border rounded-lg border p-2">
          <ConversationList />
        </div>
        <div className="hidden lg:block">
          <EmptyState
            icon={MessageSquare}
            title="Select a conversation"
            description="Pick a conversation on the left to read and reply."
          />
        </div>
      </div>
    </>
  )
}

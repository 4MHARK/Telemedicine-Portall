import { Link } from 'react-router'

import { AsyncStatus, EmptyState, LoadingSkeleton, PageHeader } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { useConversations } from '@/features/chat'
import { usePageTitle } from '@/hooks/use-page-title'
import { formatDateTime } from '@/lib/format'

export default function ProviderMessagesPage() {
  usePageTitle('Messages')
  const conversations = useConversations()

  return (
    <>
      <PageHeader
        title="Messages"
        description="Patient conversations for your confirmed appointments."
      />

      <AsyncStatus
        query={conversations}
        skeleton={<LoadingSkeleton />}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            title="No conversations yet"
            description="A thread appears after a patient's appointment is confirmed."
          />
        }
      >
        {(rows) => (
          <ul className="flex flex-col gap-2">
            {rows.map((conversation) => (
              <li key={conversation.id}>
                <Link
                  to={`/provider/messages/${conversation.id}`}
                  className="border-input hover:bg-surface-muted flex items-center gap-4 rounded-lg border p-4 transition-colors"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-medium">
                      {conversation.patientName ?? 'Patient'}
                    </span>
                    <span className="text-text-muted truncate text-sm">
                      {conversation.lastMessagePreview || 'No messages yet'}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-text-muted text-xs">
                      {formatDateTime(conversation.lastMessageAt)}
                    </span>
                    {conversation.unreadCount > 0 ? (
                      <Badge>{conversation.unreadCount}</Badge>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AsyncStatus>
    </>
  )
}

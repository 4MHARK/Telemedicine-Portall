import { MessageSquare } from 'lucide-react'
import { Link } from 'react-router'

import { AsyncStatus, EmptyState, LoadingSkeleton } from '@/components/shared'
import { useProviders } from '@/features/providers'
import { cn } from '@/lib/utils'
import type { Provider } from '@/types'
import { formatDateTime } from '@/lib/format'
import { useConversations } from './queries'

function providerName(provider: Provider | undefined): string {
  return provider ? `${provider.title} ${provider.firstName} ${provider.lastName}` : 'Provider'
}

export function ConversationList({ activeId }: { activeId?: string }) {
  const conversations = useConversations()
  const directory = useProviders({ pageSize: 50 })
  const providers = new Map((directory.data?.items ?? []).map((p) => [p.id, p]))

  return (
    <AsyncStatus
      query={conversations}
      skeleton={<LoadingSkeleton variant="list" count={3} />}
      errorTitle="Could not load conversations"
      errorFallback="Conversations are unavailable right now."
      isEmpty={(data) => data.length === 0}
      empty={
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Message a provider from their profile after booking."
        />
      }
    >
      {(data) => (
        <ul className="flex list-none flex-col gap-1 p-0" aria-label="Conversations">
          {data.map((conversation) => {
            const provider = providers.get(conversation.providerId)
            const active = conversation.id === activeId

            return (
              <li key={conversation.id}>
                <Link
                  to={`/messages/${conversation.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-start gap-3 rounded-md p-3 transition-colors',
                    active ? 'bg-surface-muted' : 'hover:bg-surface-muted',
                  )}
                >
                  {provider ? (
                    <img
                      src={provider.avatarUrl}
                      alt=""
                      className="size-9 rounded-full"
                      width={36}
                      height={36}
                    />
                  ) : (
                    <span className="bg-surface-muted size-9 rounded-full" aria-hidden="true" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">{providerName(provider)}</span>
                      <span className="text-text-subtle shrink-0 text-xs">
                        {formatDateTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <span className="text-text-muted truncate text-xs">
                      {conversation.lastMessagePreview}
                    </span>
                  </div>
                  {conversation.unreadCount > 0 ? (
                    <span className="bg-primary text-primary-fg grid size-5 shrink-0 place-items-center rounded-full text-[0.65rem]">
                      {conversation.unreadCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </AsyncStatus>
  )
}

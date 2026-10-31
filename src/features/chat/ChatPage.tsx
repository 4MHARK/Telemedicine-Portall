import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'

import { AsyncStatus, LoadingSkeleton, PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { useProviders } from '@/features/providers'
import { usePageTitle } from '@/hooks/use-page-title'
import { queryKeys } from '@/lib/queryKeys'
import type { ChatMessage, Provider } from '@/types'
import { Composer } from './Composer'
import { ConversationList } from './ConversationList'
import { MessageBubble } from './MessageBubble'
import { useConversations, useMessages, useSendMessage } from './queries'

function providerName(provider: Provider | undefined): string {
  return provider ? `${provider.title} ${provider.firstName} ${provider.lastName}` : 'Provider'
}

export default function ChatPage() {
  const { conversationId = '' } = useParams()
  usePageTitle('Conversation')

  const messages = useMessages(conversationId)
  const send = useSendMessage(conversationId)
  const conversations = useConversations()
  const directory = useProviders({ pageSize: 50 })
  const queryClient = useQueryClient()

  const conversation = conversations.data?.find((c) => c.id === conversationId)
  const provider = conversation
    ? directory.data?.items.find((p) => p.id === conversation.providerId)
    : undefined

  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll whenever the thread grows, including from a poll.
  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages.data?.length])

  function retry(message: ChatMessage) {
    // Drop the failed optimistic copy, then send the same text again.
    queryClient.setQueryData<ChatMessage[]>(queryKeys.chat.messages(conversationId), (old) =>
      (old ?? []).filter((candidate) => candidate.id !== message.id),
    )
    send.mutate(message.body)
  }

  return (
    <>
      <PageHeader title="Conversation" />

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <div className="border-border hidden rounded-lg border p-2 lg:block">
          <ConversationList activeId={conversationId} />
        </div>

        <div
          className="border-border flex min-h-[60vh] flex-col rounded-lg border"
          data-slot="chat-thread"
        >
          <header className="border-border flex items-center gap-3 border-b p-3">
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              aria-label="Back to conversations"
              nativeButton={false}
              render={<Link to="/messages" />}
            >
              <ArrowLeft className="size-4" />
            </Button>
            {provider ? (
              <img
                src={provider.avatarUrl}
                alt=""
                className="size-8 rounded-full"
                width={32}
                height={32}
              />
            ) : null}
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{providerName(provider)}</span>
              <span className="text-text-muted text-xs">Replies appear within a few seconds</span>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4" data-slot="message-scroll">
            <AsyncStatus
              query={messages}
              skeleton={<LoadingSkeleton variant="list" count={3} />}
              errorTitle="Could not load this conversation"
              errorFallback="The conversation is unavailable right now."
            >
              {(data) => (
                <ul className="flex list-none flex-col gap-3 p-0" aria-label="Messages">
                  {data.map((message) => (
                    <MessageBubble key={message.id} message={message} onRetry={retry} />
                  ))}
                </ul>
              )}
            </AsyncStatus>
          </div>

          <div className="p-3">
            <Composer onSend={(body) => send.mutate(body)} disabled={messages.isPending} />
          </div>
        </div>
      </div>
    </>
  )
}

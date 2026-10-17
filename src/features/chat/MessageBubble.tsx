import { AlertCircle, Check, CheckCheck, Clock } from 'lucide-react'
import { memo } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types'

export interface MessageBubbleProps {
  message: ChatMessage
  onRetry?: (message: ChatMessage) => void
}

function StatusIcon({ message }: { message: ChatMessage }) {
  switch (message.status) {
    case 'sending':
      return <Clock className="size-3" aria-label="Sending" />
    case 'sent':
      return <Check className="size-3" aria-label="Sent" />
    case 'delivered':
      return <CheckCheck className="size-3" aria-label="Delivered" />
    case 'read':
      return <CheckCheck className="text-primary size-3" aria-label="Read" />
    case 'failed':
      return <AlertCircle className="text-danger size-3" aria-label="Failed" />
  }
}

/**
 * docs/decisions.md row 11: memoised with a stable key, because a 3 s poll on a
 * long thread re-renders the list constantly.
 */
export const MessageBubble = memo(function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const mine = message.senderRole === 'patient'

  return (
    <li
      className={cn('flex flex-col gap-1', mine ? 'items-end' : 'items-start')}
      data-slot="message-bubble"
    >
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
          mine ? 'bg-primary text-primary-fg' : 'bg-surface-muted text-text',
        )}
      >
        {message.body}
      </div>
      {mine ? (
        <span className="text-text-muted flex items-center gap-1 text-xs">
          <StatusIcon message={message} />
          {message.status === 'failed' ? (
            <>
              Not sent
              {onRetry ? (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => onRetry(message)}
                >
                  Retry
                </Button>
              ) : null}
            </>
          ) : null}
        </span>
      ) : null}
    </li>
  )
})

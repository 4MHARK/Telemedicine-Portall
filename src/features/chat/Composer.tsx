import { useState } from 'react'

import { Button } from '@/components/ui/button'

export function Composer({
  onSend,
  disabled = false,
}: {
  onSend: (body: string) => void
  disabled?: boolean
}) {
  const [value, setValue] = useState('')
  const canSend = value.trim().length > 0 && !disabled

  function submit() {
    if (!canSend) return
    onSend(value.trim())
    // Cleared immediately: the optimistic append is what shows the message.
    setValue('')
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="border-border flex items-end gap-2 border-t pt-3"
    >
      <label htmlFor="composer" className="sr-only">
        Message
      </label>
      <textarea
        id="composer"
        rows={1}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
        }}
        placeholder="Write a message…"
        className="border-input bg-surface focus-visible:border-ring max-h-32 min-h-9 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none"
      />
      <Button type="submit" disabled={!canSend}>
        Send
      </Button>
    </form>
  )
}

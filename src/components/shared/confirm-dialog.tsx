import { useState } from 'react'
import type { ReactElement } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export interface ConfirmDialogProps {
  /** The element that opens the dialog, e.g. a Button. */
  trigger: ReactElement
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  /** Styles the confirm button as destructive (cancel an appointment, delete a document). */
  destructive?: boolean
  /** Disables both buttons while the caller's mutation is in flight. */
  isPending?: boolean
}

/**
 * Confirmation wrapper around the Base UI dialog, for the two irreversible-ish
 * actions in the app: cancelling an appointment and deleting a document.
 *
 * The dialog closes as soon as Confirm is pressed; the caller owns whatever
 * pending/error UI follows.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  destructive = false,
  isPending = false,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)

  function handleConfirm() {
    setOpen(false)
    onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

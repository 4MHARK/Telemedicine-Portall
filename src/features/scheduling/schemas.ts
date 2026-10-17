import { z } from 'zod'

/**
 * The whole wizard in one schema, because docs/decisions.md row 3 keeps a
 * single useForm across all five steps: step 5 submits every field together.
 */
export const wizardSchema = z.object({
  slotId: z.string().min(1, 'Choose a time slot.'),
  consultationType: z.enum(['video', 'phone', 'async'], {
    errorMap: () => ({ message: 'Choose a consultation type.' }),
  }),
  reason: z
    .string()
    .trim()
    .min(1, 'Tell the provider why you are booking.')
    .max(500, 'Keep the reason under 500 characters.'),
})

export type WizardValues = z.infer<typeof wizardSchema>

/** Fields validated before leaving each step, in step order. */
export const STEP_FIELDS: ReadonlyArray<ReadonlyArray<keyof WizardValues>> = [
  ['slotId'],
  ['consultationType'],
  ['reason'],
  [],
  [],
]

export const STEP_LABELS = ['Slot', 'Type', 'Reason', 'Review', 'Confirm'] as const

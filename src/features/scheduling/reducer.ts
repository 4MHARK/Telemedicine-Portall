import type { ConsultationType } from '@/types'

export const WIZARD_STEP_COUNT = 5

export interface WizardDraft {
  slotId: string | null
  consultationType: ConsultationType | null
  reason: string
}

export type WizardStatus = 'idle' | 'submitting' | 'error'

export interface WizardState {
  step: number
  draft: WizardDraft
  status: WizardStatus
  /**
   * The message behind status === 'error'. Not in docs/state-matrix.md's
   * three-field shape, but the 409 SLOT_TAKEN path needs somewhere to carry
   * it back to the Slot step.
   */
  error: string | null
}

export const initialWizardState: WizardState = {
  step: 0,
  draft: { slotId: null, consultationType: null, reason: '' },
  status: 'idle',
  error: null,
}

export type WizardAction =
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'GOTO'; step: number }
  | { type: 'UPDATE_DRAFT'; draft: Partial<WizardDraft> }
  | { type: 'RESET' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; message: string }

function clampStep(step: number): number {
  if (!Number.isFinite(step)) return 0
  return Math.min(Math.max(0, Math.trunc(step)), WIZARD_STEP_COUNT - 1)
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'NEXT':
      return { ...state, step: clampStep(state.step + 1), error: null }
    case 'BACK':
      return { ...state, step: clampStep(state.step - 1), error: null }
    case 'GOTO':
      return { ...state, step: clampStep(action.step), error: null }
    case 'UPDATE_DRAFT':
      return { ...state, draft: { ...state.draft, ...action.draft } }
    case 'RESET':
      return initialWizardState
    case 'SUBMIT_START':
      return { ...state, status: 'submitting', error: null }
    case 'SUBMIT_SUCCESS':
      return initialWizardState
    case 'SUBMIT_ERROR':
      return { ...state, status: 'error', error: action.message }
  }
}

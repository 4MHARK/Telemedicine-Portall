import { describe, expect, it } from 'vitest'

import { WIZARD_STEP_COUNT, initialWizardState, wizardReducer } from './reducer'

describe('wizardReducer', () => {
  it('advances one step at a time', () => {
    const next = wizardReducer(initialWizardState, { type: 'NEXT' })
    expect(next.step).toBe(1)
  })

  it('clamps NEXT at the final step', () => {
    const atEnd = { ...initialWizardState, step: WIZARD_STEP_COUNT - 1 }
    expect(wizardReducer(atEnd, { type: 'NEXT' }).step).toBe(WIZARD_STEP_COUNT - 1)
  })

  it('goes back and clamps at the first step', () => {
    expect(wizardReducer({ ...initialWizardState, step: 2 }, { type: 'BACK' }).step).toBe(1)
    expect(wizardReducer(initialWizardState, { type: 'BACK' }).step).toBe(0)
  })

  it('jumps to a step and clamps out-of-range input', () => {
    expect(wizardReducer(initialWizardState, { type: 'GOTO', step: 3 }).step).toBe(3)
    expect(wizardReducer(initialWizardState, { type: 'GOTO', step: -2 }).step).toBe(0)
    expect(wizardReducer(initialWizardState, { type: 'GOTO', step: 99 }).step).toBe(
      WIZARD_STEP_COUNT - 1,
    )
  })

  it('treats a non-finite step as the first step', () => {
    expect(wizardReducer(initialWizardState, { type: 'GOTO', step: Number.NaN }).step).toBe(0)
  })

  it('merges draft updates instead of replacing them', () => {
    const withSlot = wizardReducer(initialWizardState, {
      type: 'UPDATE_DRAFT',
      draft: { slotId: 'slot_1' },
    })
    const withReason = wizardReducer(withSlot, {
      type: 'UPDATE_DRAFT',
      draft: { reason: 'Headache' },
    })

    expect(withReason.draft).toEqual({
      slotId: 'slot_1',
      consultationType: null,
      reason: 'Headache',
    })
  })

  it('keeps the step when the draft changes', () => {
    const atStep = { ...initialWizardState, step: 2 }
    const updated = wizardReducer(atStep, {
      type: 'UPDATE_DRAFT',
      draft: { consultationType: 'video' },
    })
    expect(updated.step).toBe(2)
  })

  it('clears a previous error on navigation', () => {
    const errored = wizardReducer(initialWizardState, { type: 'SUBMIT_ERROR', message: 'boom' })
    expect(errored.error).toBe('boom')

    expect(wizardReducer(errored, { type: 'NEXT' }).error).toBeNull()
    expect(wizardReducer(errored, { type: 'BACK' }).error).toBeNull()
    expect(wizardReducer(errored, { type: 'GOTO', step: 2 }).error).toBeNull()
  })

  it('tracks submit start and error', () => {
    const started = wizardReducer(initialWizardState, { type: 'SUBMIT_START' })
    expect(started.status).toBe('submitting')
    expect(started.error).toBeNull()

    const failed = wizardReducer(started, { type: 'SUBMIT_ERROR', message: 'SLOT_TAKEN' })
    expect(failed.status).toBe('error')
    expect(failed.error).toBe('SLOT_TAKEN')
  })

  it('resets to the initial state on success', () => {
    const dirty = {
      ...initialWizardState,
      step: 4,
      status: 'submitting' as const,
      draft: { slotId: 'slot_1', consultationType: 'video' as const, reason: 'x' },
    }
    expect(wizardReducer(dirty, { type: 'SUBMIT_SUCCESS' })).toEqual(initialWizardState)
  })

  it('resets on demand', () => {
    const dirty = { ...initialWizardState, step: 3 }
    expect(wizardReducer(dirty, { type: 'RESET' })).toEqual(initialWizardState)
  })

  it('never mutates the previous state', () => {
    const previous = { ...initialWizardState, step: 1 }
    wizardReducer(previous, { type: 'NEXT' })
    wizardReducer(previous, { type: 'UPDATE_DRAFT', draft: { reason: 'x' } })
    expect(previous.step).toBe(1)
    expect(previous.draft.reason).toBe('')
  })
})

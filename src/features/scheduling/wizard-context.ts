import { createContext, useContext } from 'react'
import type { Dispatch } from 'react'

import type { WizardAction, WizardState } from './reducer'

export interface WizardContextValue {
  state: WizardState
  dispatch: Dispatch<WizardAction>
}

export const WizardContext = createContext<WizardContextValue | null>(null)

export function useWizard(): WizardContextValue {
  const context = useContext(WizardContext)
  if (!context) {
    throw new Error('useWizard must be used within a <WizardProvider>')
  }
  return context
}

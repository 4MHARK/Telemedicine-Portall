import { useReducer } from 'react'
import type { ReactNode } from 'react'

import { initialWizardState, wizardReducer } from './reducer'
import { WizardContext } from './wizard-context'

/**
 * The draft lives here, in Context + Reducer, and is discarded when the
 * provider unmounts — which is what leaving the wizard does. React Hook Form
 * holds the live values; the reducer holds step, status and a draft snapshot.
 */
export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState)

  return <WizardContext.Provider value={{ state, dispatch }}>{children}</WizardContext.Provider>
}

import { appointmentHandlers } from './appointments'
import { authHandlers } from './auth'
import { chatHandlers } from './chat'
import { documentHandlers } from './documents'
import { providerHandlers } from './providers'
import { specialtyHandlers } from './specialties'

/** Every handler, in the order docs/api-contract.md lists the resources. */
export const handlers = [
  ...authHandlers,
  ...specialtyHandlers,
  ...providerHandlers,
  ...appointmentHandlers,
  ...documentHandlers,
  ...chatHandlers,
]

import { Router } from 'express'

import { appointmentsRouter } from './appointments.js'
import { authRouter } from './auth.js'
import { conversationsRouter } from './conversations.js'
import { documentsRouter } from './documents.js'
import { providersRouter } from './providers.js'
import { seedRouter } from './seed.js'
import { specialtiesRouter } from './specialties.js'

/**
 * The frontend's contract, mounted under /api. There is no /doctors,
 * /patients or /prescriptions surface: this is a patient-only portal and the
 * directory noun in the UI is "provider".
 */
export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/specialties', specialtiesRouter)
apiRouter.use('/providers', providersRouter)
apiRouter.use('/appointments', appointmentsRouter)
apiRouter.use('/documents', documentsRouter)
apiRouter.use('/conversations', conversationsRouter)
apiRouter.use('/seed', seedRouter)

import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'

/** Service worker used by `npm run dev`. Started from src/main.tsx. */
export const worker = setupWorker(...handlers)

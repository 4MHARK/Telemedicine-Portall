import { setupServer } from 'msw/node'

import { handlers } from './handlers'

/** Node server used by the test suite. Registered in src/test/setup.ts. */
export const server = setupServer(...handlers)

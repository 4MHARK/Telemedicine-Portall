import { setupServer } from 'msw/node'

/**
 * MSW v2 server for the test environment.
 *
 * decisions.md locks all data to MSW v2 and states that no real network call
 * leaves the browser. Handlers are intentionally empty in this step — feature
 * handlers ship with their features. The server is registered with
 * `onUnhandledRequest: 'error'` (see ../setup.ts) so an unmocked request fails
 * the test loudly instead of silently reaching the network.
 */
export const server = setupServer()

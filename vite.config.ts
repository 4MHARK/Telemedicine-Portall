import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  // Loaded from .env files as well as the shell, so VITE_BASE_PATH works as
  // documented in .env.example. "/" is the default for root deployments.
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // A production artifact must never use the mock API or the simulate-payment
  // button. Fail the build instead of shipping a demo that cannot reach the
  // real backend.
  if (mode === 'production' && env.VITE_ENABLE_MOCKS === 'true') {
    throw new Error('Refusing to build: VITE_ENABLE_MOCKS=true is development-only.')
  }
  if (mode === 'production' && env.VITE_PAYMENTS_FAKE === 'true') {
    throw new Error('Refusing to build: VITE_PAYMENTS_FAKE=true is test-only.')
  }

  const apiProxy = {
    '/api': {
      target: env.VITE_API_PROXY_TARGET ?? 'http://localhost:3001',
      changeOrigin: true,
    },
  }

  return {
    // The router reads import.meta.env.BASE_URL so deep links stay inside the
    // same base when the app is hosted under a subpath.
    base: env.VITE_BASE_PATH ?? '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      // The live API is the default. With VITE_ENABLE_MOCKS=true, the dev
      // service worker intercepts /api before the request reaches this proxy.
      proxy: apiProxy,
    },
    preview: {
      // vite preview does not inherit server.proxy.
      proxy: apiProxy,
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      // Every mock response carries 200-600ms of simulated latency
      // (docs/api-contract.md, Simulated Conditions), so any test making a few
      // requests blows the 5s default.
      testTimeout: 15_000,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/components/ui/**', // registry-generated
          'src/mocks/**', // the mock API itself
          'src/test/**',
          'src/**/*.test.{ts,tsx}',
          'src/**/*.d.ts',
        ],
        // docs/decisions.md row 15: per-directory thresholds, never global.
        thresholds: {
          'src/features/**/reducer.ts': { statements: 90, branches: 90, functions: 90, lines: 90 },
          'src/features/**/schemas.ts': { statements: 90, branches: 90, functions: 90, lines: 90 },
          'src/hooks/**': { statements: 85, branches: 85, functions: 85, lines: 85 },
          'src/features/**/api.ts': { statements: 80, branches: 80, functions: 80, lines: 80 },
        },
      },
    },
  }
})

import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'

/**
 * Shell placeholder. There is no router yet (React Router 7 arrives with the
 * shell feature), so this is the single surface that proves the provider tree,
 * the design tokens and the Base UI primitives are all live.
 */
export default function App() {
  return (
    <main className="bg-surface text-text flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Telemedicine Portal</h1>
      <p className="text-text-muted text-sm">Phase 1 shell — features land in later phases.</p>
      <Button>Proof of life</Button>
      <Toaster />
    </main>
  )
}

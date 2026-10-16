import { PageHeader, ErrorState } from '@/components/shared'
import { usePageTitle } from '@/hooks/use-page-title'
import { useNavigate } from 'react-router'

/** Unmatched routes. docs/routes.md: `*` -> 404. */
export default function NotFoundPage() {
  usePageTitle('Page not found')
  const navigate = useNavigate()

  return (
    <>
      <PageHeader title="Page not found" />
      <ErrorState
        title="Page not found"
        message="That page does not exist. Check the address, or pick a destination from the navigation."
        onRetry={() => void navigate('/doctors')}
        retryLabel="Browse doctors"
      />
    </>
  )
}

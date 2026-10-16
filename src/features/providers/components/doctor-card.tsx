import { Star } from 'lucide-react'
import { Link } from 'react-router'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatAvailability, formatRating } from '@/lib/format'
import type { Provider, Specialty } from '@/types'

export interface DoctorCardProps {
  provider: Provider
  specialties: readonly Specialty[]
}

export function DoctorCard({ provider, specialties }: DoctorCardProps) {
  const providerSpecialties = specialties.filter((s) => provider.specialtyIds.includes(s.id))
  const hasAvailability = provider.nextAvailableAt !== null

  return (
    <Card className="h-full" data-slot="doctor-card">
      <CardContent className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-start gap-4">
          <img
            src={provider.avatarUrl}
            alt=""
            className="size-14 shrink-0 rounded-full"
            width={56}
            height={56}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <Link to={`/doctors/${provider.id}`} className="truncate font-medium hover:underline">
              {provider.title} {provider.firstName} {provider.lastName}
            </Link>
            <p className="text-text-muted truncate text-sm">
              {providerSpecialties.map((s) => s.name).join(', ') || 'General practice'}
            </p>
            <p className="text-text-muted flex items-center gap-1 text-sm">
              <Star className="size-3.5 fill-current" aria-hidden="true" />
              <span className="font-medium text-text">{formatRating(provider.rating)}</span>
              <span>({provider.reviewCount} reviews)</span>
            </p>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Badge variant={hasAvailability ? 'secondary' : 'outline'}>
            {hasAvailability
              ? `Next: ${formatAvailability(provider.nextAvailableAt)}`
              : 'No availability'}
          </Badge>
          {provider.consultationTypes.slice(0, 2).map((type) => (
            <Badge key={type} variant="outline" className="capitalize">
              {type}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

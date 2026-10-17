import { Filter, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { ConsultationType, Specialty } from '@/types'
import type { AvailabilityFilter, ProviderFilterState } from '../useProviderFilters'

const AVAILABILITY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'any', label: 'Any' },
  { value: 'now', label: 'Now' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
]

const CONSULTATION_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'any', label: 'Any' },
  { value: 'video', label: 'Video' },
  { value: 'phone', label: 'Phone' },
  { value: 'async', label: 'Async' },
]

interface SegmentedFilterProps {
  label: string
  options: ReadonlyArray<{ value: string; label: string }>
  selected: string | null
  onChange: (value: string | null) => void
}

/** Single-select segmented control over the Base UI toggle group. */
function SegmentedFilter({ label, options, selected, onChange }: SegmentedFilterProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-text-muted text-xs font-medium">{label}</span>
      <ToggleGroup
        aria-label={label}
        value={[selected ?? 'any']}
        onValueChange={(values) => {
          const next = values[values.length - 1]
          onChange(!next || next === 'any' ? null : next)
        }}
        className="rounded-md border p-0.5"
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="rounded px-2.5 text-xs"
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

function SpecialtyChecklist({
  specialties,
  selected,
  onToggle,
}: {
  specialties: readonly Specialty[]
  selected: readonly string[]
  onToggle: (slug: string) => void
}) {
  return (
    <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
      {specialties.map((specialty) => (
        <label
          key={specialty.id}
          className="hover:bg-surface-muted flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm"
        >
          <input
            type="checkbox"
            className="accent-primary size-4"
            checked={selected.includes(specialty.slug)}
            onChange={() => onToggle(specialty.slug)}
          />
          {specialty.name}
        </label>
      ))}
    </div>
  )
}

export interface ProviderFiltersBarProps {
  state: ProviderFilterState
  specialties: readonly Specialty[]
  isLoadingSpecialties: boolean
}

export function ProviderFiltersBar({
  state,
  specialties,
  isLoadingSpecialties,
}: ProviderFiltersBarProps) {
  const {
    filters,
    activeCount,
    setSearch,
    toggleSpecialty,
    setAvailability,
    setConsultationType,
    clear,
  } = state

  // The input is local so typing stays instant; the URL is written 300ms later.
  const [search, setSearchInput] = useState(filters.q ?? '')
  const debounced = useDebouncedValue(search, 300)
  const pushed = useRef<string | null>(null)

  // Local -> URL
  useEffect(() => {
    if (debounced === (filters.q ?? '')) return
    pushed.current = debounced
    setSearch(debounced)
  }, [debounced, filters.q, setSearch])

  // URL -> local, skipping the value we just wrote (otherwise the box would
  // fight the user's typing).
  useEffect(() => {
    const urlQuery = filters.q ?? ''
    if (urlQuery === pushed.current) {
      pushed.current = null
      return
    }
    setSearchInput(urlQuery)
  }, [filters.q])

  const selectedSpecialties = filters.specialty ?? []

  const checklist = (
    <SpecialtyChecklist
      specialties={specialties}
      selected={selectedSpecialties}
      onToggle={toggleSpecialty}
    />
  )

  return (
    <section
      aria-label="Provider filters"
      className="border-border mb-6 flex flex-col gap-4 rounded-lg border p-4"
      data-slot="provider-filters"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-56 flex-1">
          <label
            htmlFor="provider-search"
            className="text-text-muted mb-1.5 block text-xs font-medium"
          >
            Search
          </label>
          <Search
            className="text-text-subtle pointer-events-none absolute bottom-2.5 left-2.5 size-4"
            aria-hidden="true"
          />
          <Input
            id="provider-search"
            value={search}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Name or keyword"
            className="pl-8"
          />
        </div>

        {/* Desktop: popover. Mobile: sheet. */}
        <div className="hidden md:block">
          <span className="text-text-muted mb-1.5 block text-xs font-medium">Specialty</span>
          <Popover>
            <PopoverTrigger
              render={<Button variant="outline" className="justify-between gap-2 font-normal" />}
            >
              <Filter className="size-4" aria-hidden="true" />
              {selectedSpecialties.length > 0
                ? `Specialty (${selectedSpecialties.length})`
                : 'All specialties'}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64">
              {isLoadingSpecialties ? (
                <p className="text-text-muted text-sm">Loading specialties…</p>
              ) : (
                checklist
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="md:hidden">
          <span className="text-text-muted mb-1.5 block text-xs font-medium">Specialty</span>
          <Sheet>
            <SheetTrigger
              render={<Button variant="outline" className="justify-between gap-2 font-normal" />}
            >
              <Filter className="size-4" aria-hidden="true" />
              {selectedSpecialties.length > 0
                ? `Specialty (${selectedSpecialties.length})`
                : 'All specialties'}
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Specialty</SheetTitle>
                <SheetDescription>Choose one or more specialties.</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6">
                {isLoadingSpecialties ? (
                  <p className="text-text-muted text-sm">Loading specialties…</p>
                ) : (
                  checklist
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {activeCount > 0 ? (
          <Button variant="ghost" onClick={clear} className="gap-1.5">
            <X className="size-4" aria-hidden="true" />
            Reset filters
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-6">
        <SegmentedFilter
          label="Availability"
          options={AVAILABILITY_OPTIONS}
          selected={filters.availability ?? null}
          onChange={(value) => setAvailability(value as AvailabilityFilter | null)}
        />
        <SegmentedFilter
          label="Consultation type"
          options={CONSULTATION_OPTIONS}
          selected={filters.consultationType ?? null}
          onChange={(value) => setConsultationType(value as ConsultationType | null)}
        />
      </div>
    </section>
  )
}

// In-memory mock data, seeded once from a fixed PRNG so reloads match.
// Handlers mutate these arrays directly — this is the "database".
import type {
  Appointment,
  AppointmentStatus,
  AvailabilitySlot,
  ChatMessage,
  ConsultationType,
  Conversation,
  Document,
  ISODateString,
  Patient,
  Provider,
  Specialty,
  UUID,
} from '@/types'

// Seeded PRNG

const SEED = 20260216

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = mulberry32(SEED)

function int(min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

function decimal(min: number, max: number, places: number): number {
  return Number((min + rng() * (max - min)).toFixed(places))
}

function pick<T>(items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)]
  if (item === undefined) throw new Error('pick() called with an empty list')
  return item
}

function pickSome<T>(items: readonly T[], min: number, max: number): T[] {
  const pool = [...items]
  const out: T[] = []
  const count = int(min, max)
  while (out.length < count && pool.length > 0) {
    const [taken] = pool.splice(Math.floor(rng() * pool.length), 1)
    if (taken !== undefined) out.push(taken)
  }
  return out
}

// Dates

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

// Midnight UTC, so slot times are stable for the day.
const BASE_MS = (() => {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d.getTime()
})()

function iso(ms: number): ISODateString {
  return new Date(ms).toISOString()
}

function at(dayOffset: number, hour: number, minute = 0): number {
  return BASE_MS + dayOffset * DAY_MS + hour * HOUR_MS + minute * 60_000
}

// Presentation helpers

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

// Inline SVG so avatars don't hit the network.
function avatarDataUri(label: string, hue: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
    `<rect width="96" height="96" rx="48" fill="hsl(${hue} 42% 58%)"/>` +
    `<text x="48" y="61" font-family="system-ui,sans-serif" font-size="34" font-weight="600" ` +
    `fill="#ffffff" text-anchor="middle">${label}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

// Specialties (12)

const SPECIALTY_SEED: ReadonlyArray<{ name: string; slug: string; icon: string }> = [
  { name: 'Cardiology', slug: 'cardiology', icon: 'HeartPulse' },
  { name: 'Dermatology', slug: 'dermatology', icon: 'Sparkles' },
  { name: 'Pediatrics', slug: 'pediatrics', icon: 'Baby' },
  { name: 'Psychiatry', slug: 'psychiatry', icon: 'Brain' },
  { name: 'Orthopedics', slug: 'orthopedics', icon: 'Bone' },
  { name: 'Neurology', slug: 'neurology', icon: 'Activity' },
  { name: 'Endocrinology', slug: 'endocrinology', icon: 'Droplets' },
  { name: 'Gastroenterology', slug: 'gastroenterology', icon: 'Pill' },
  { name: 'Ophthalmology', slug: 'ophthalmology', icon: 'Eye' },
  { name: 'Otolaryngology', slug: 'otolaryngology', icon: 'Ear' },
  { name: 'Obstetrics & Gynecology', slug: 'obstetrics-gynecology', icon: 'Ribbon' },
  { name: 'Family Medicine', slug: 'family-medicine', icon: 'Stethoscope' },
]

export const specialties: Specialty[] = SPECIALTY_SEED.map((s, i) => ({
  id: `spc_${String(i + 1).padStart(2, '0')}`,
  name: s.name,
  slug: s.slug,
  icon: s.icon,
}))

// Providers (40)

const FIRST_NAMES = [
  'Amara',
  'Priya',
  'Daniel',
  'Mei',
  'Tomas',
  'Yusuf',
  'Elena',
  'Grace',
  'Hassan',
  'Ingrid',
  'Jonas',
  'Keiko',
  'Lucia',
  'Marcus',
  'Nadia',
  'Omar',
  'Petra',
  'Quentin',
  'Rosa',
  'Samuel',
  'Tanya',
  'Umar',
  'Vera',
  'Wei',
  'Xander',
  'Yara',
  'Zoe',
  'Adaeze',
  'Bruno',
  'Camila',
  'Dmitri',
  'Esme',
  'Farid',
  'Greta',
  'Hugo',
  'Iris',
  'Jamal',
  'Klara',
  'Liam',
  'Mira',
] as const

const LAST_NAMES = [
  'Okafor',
  'Nakamura',
  'Silva',
  'Haddad',
  'Kowalski',
  'Andersen',
  'Mensah',
  'Rivera',
  'Novak',
  'Bauer',
  'Costa',
  'Duarte',
  'Eriksen',
  'Fontaine',
  'Gallo',
  'Hoffmann',
  'Ibrahim',
  'Jansen',
  'Kaur',
  'Lindqvist',
  'Moreau',
  'Nguyen',
  'Olsen',
  'Pereira',
  'Quintero',
  'Rossi',
  'Santos',
  'Tanaka',
  'Ueda',
  'Vasquez',
  'Weber',
  'Ximenes',
  'Yilmaz',
  'Zhang',
  'Adeyemi',
  'Bianchi',
  'Chen',
  'Delgado',
  'Espinoza',
  'Farrell',
] as const

const LANGUAGES = [
  'English',
  'Spanish',
  'Mandarin',
  'French',
  'Hindi',
  'Arabic',
  'Portuguese',
  'German',
  'Yoruba',
  'Japanese',
] as const

const CONSULTATION_TYPES: readonly ConsultationType[] = ['video', 'phone', 'async']

const BIO_OPENERS = [
  'Board-certified specialist focused on',
  'Practises evidence-based care in',
  'Combines clinical research with',
  'Has spent a decade in',
  'Works primarily in',
] as const

const BIO_FOCUS = [
  'preventive screening and long-term management',
  'diagnosis of complex and overlapping presentations',
  'patient education and shared decision making',
  'chronic condition management and follow-up',
  'acute assessment with same-day escalation',
] as const

function makeProvider(index: number, specialtyIds: UUID[]): Provider {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length] ?? 'Alex'
  const lastName = LAST_NAMES[index % LAST_NAMES.length] ?? 'Morgan'
  const yearsExperience = int(3, 30)

  return {
    id: `prv_${String(index + 1).padStart(2, '0')}`,
    firstName,
    lastName,
    title: 'Dr.',
    specialtyIds,
    bio: `${pick(BIO_OPENERS)} ${pick(BIO_FOCUS)}. ${yearsExperience} years in practice.`,
    avatarUrl: avatarDataUri(initials(firstName, lastName), int(0, 359)),
    yearsExperience,
    rating: decimal(3.8, 5, 1),
    reviewCount: int(12, 420),
    languages: ['English', ...pickSome(LANGUAGES.slice(1), 0, 2)],
    consultationTypes: pickSome(CONSULTATION_TYPES, 1, 3),
    // Set once slots exist.
    nextAvailableAt: null,
  }
}

export const providers: Provider[] = []
for (let i = 0; i < 40; i++) {
  // Round-robin the primary specialty; every third provider gets a second one.
  const primary = specialties[i % specialties.length]
  if (!primary) throw new Error('specialties seed is empty')
  const extra = i % 3 === 0 ? pickSome(specialties, 1, 1) : []
  const specialtyIds = [primary.id, ...extra.map((s) => s.id).filter((id) => id !== primary.id)]
  providers.push(makeProvider(i, specialtyIds))
}

// Availability slots (~15 per provider, next 14 days)

const SLOT_HOURS = [9, 10, 11, 13, 14, 15, 16] as const
const SLOT_MINUTES = [0, 30] as const

export const slots: AvailabilitySlot[] = []

for (const provider of providers) {
  const used = new Set<string>()
  let attempts = 0
  while (used.size < 15 && attempts < 200) {
    attempts++
    const key = `${int(1, 14)}:${pick(SLOT_HOURS)}:${pick(SLOT_MINUTES)}`
    if (used.has(key)) continue
    used.add(key)

    const [day, hour, minute] = key.split(':').map(Number)
    if (day === undefined || hour === undefined || minute === undefined) continue
    const start = at(day, hour, minute)
    slots.push({
      id: `slot_${provider.id}_${used.size}`,
      providerId: provider.id,
      start: iso(start),
      end: iso(start + 30 * 60_000),
      status: 'available',
    })
  }
}

// A few blocked slots so the status isn't unused.
for (const slot of pickSome(slots, 20, 30)) slot.status = 'blocked'

// Slots in the next hour or two, so availability=now has something to match.
const NO_AVAILABILITY_INDEXES = [1, 2] as const
providers.forEach((provider, i) => {
  if (i % 3 !== 0 || NO_AVAILABILITY_INDEXES.includes(i as 1 | 2)) return
  for (const minutes of [30, 75]) {
    const start = Date.now() + minutes * 60_000
    slots.push({
      id: `slot_soon_${provider.id}_${minutes}`,
      providerId: provider.id,
      start: iso(start),
      end: iso(start + 30 * 60_000),
      status: 'available',
    })
  }
})

// Patients (3)

function makePatient(
  index: number,
  first: string,
  last: string,
  insuranceProvider: string,
  insuranceMemberId: string,
): Patient {
  return {
    id: `pat_${String(index + 1).padStart(2, '0')}`,
    firstName: first,
    lastName: last,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    phone: `+1-555-0${String(100 + index)}`,
    dateOfBirth: iso(at(-int(9_000, 20_000), 12)),
    avatarUrl: avatarDataUri(initials(first, last), int(0, 359)),
    insuranceProvider,
    insuranceMemberId,
  }
}

export const patients: Patient[] = [
  makePatient(0, 'Nadia', 'Okafor', 'Blue Cross', 'BC-4471902'),
  makePatient(1, 'Tomas', 'Silva', 'Aetna', 'AE-8823014'),
  makePatient(2, 'Mei', 'Chen', 'UnitedHealth', 'UH-1190283'),
]

// The signed-in patient.
export const CURRENT_PATIENT_ID: UUID = patients[0]?.id ?? 'pat_01'

// Appointments (8 for the current patient)

const REASONS = [
  'Recurring headaches for the past two weeks',
  'Follow-up on blood pressure medication',
  'Persistent cough that has not cleared',
  'Review of recent blood test results',
  'Skin irritation on both forearms',
  'Sleep difficulties affecting work',
  'Annual check-up and vaccination review',
  'Knee pain after running',
] as const

const CANCEL_REASONS = [
  'Schedule conflict',
  'Rescheduling to next month',
  'Symptoms resolved',
] as const

export const appointments: Appointment[] = []

function bookSlot(slot: AvailabilitySlot): void {
  slot.status = 'booked'
}

// Backing slots for past appointments.
function historicalSlot(
  providerId: UUID,
  dayOffset: number,
  status: AvailabilitySlot['status'],
): AvailabilitySlot {
  const start = at(dayOffset, 10)
  const slot: AvailabilitySlot = {
    id: `slot_hist_${slots.length + 1}`,
    providerId,
    start: iso(start),
    end: iso(start + 30 * 60_000),
    status,
  }
  slots.push(slot)
  return slot
}

const APPOINTMENT_PLAN: ReadonlyArray<AppointmentStatus> = [
  'scheduled',
  'scheduled',
  'scheduled',
  'scheduled',
  'completed',
  'completed',
  'completed',
  'cancelled',
]

APPOINTMENT_PLAN.forEach((status, i) => {
  const provider = pick(providers)
  const reason = REASONS[i % REASONS.length] ?? 'General consultation'

  let slot: AvailabilitySlot | undefined
  if (status === 'scheduled') {
    slot = slots.find(
      (s) =>
        s.providerId === provider.id &&
        s.status === 'available' &&
        Date.parse(s.start) > Date.now(),
    )
    if (slot) bookSlot(slot)
  } else {
    slot = historicalSlot(provider.id, -int(5, 60), status === 'cancelled' ? 'available' : 'booked')
  }

  const scheduledAt = slot?.start ?? iso(at(-int(5, 60), 10))
  const createdAt = iso(Date.parse(scheduledAt) - int(2, 20) * DAY_MS)

  appointments.push({
    id: `apt_${String(i + 1).padStart(2, '0')}`,
    patientId: CURRENT_PATIENT_ID,
    providerId: provider.id,
    slotId: slot?.id ?? `slot_orphan_${i + 1}`,
    consultationType: pick(provider.consultationTypes),
    status,
    reason,
    ...(status === 'completed' ? { notes: 'Reviewed and stable. Follow up in six months.' } : {}),
    scheduledAt,
    durationMinutes: 30,
    createdAt,
    ...(status === 'cancelled'
      ? { cancelledAt: iso(Date.parse(scheduledAt) - DAY_MS), cancelReason: pick(CANCEL_REASONS) }
      : {}),
  })
})

// Documents (6 for the current patient)

const DOCUMENT_SEED: ReadonlyArray<{ fileName: string; mimeType: string; sizeBytes: number }> = [
  { fileName: 'blood-panel-february.pdf', mimeType: 'application/pdf', sizeBytes: 284_512 },
  { fileName: 'chest-xray.png', mimeType: 'image/png', sizeBytes: 1_820_933 },
  { fileName: 'insurance-card.jpg', mimeType: 'image/jpeg', sizeBytes: 742_118 },
  { fileName: 'referral-letter.pdf', mimeType: 'application/pdf', sizeBytes: 96_204 },
  { fileName: 'allergy-test-results.pdf', mimeType: 'application/pdf', sizeBytes: 351_776 },
  { fileName: 'medication-list.pdf', mimeType: 'application/pdf', sizeBytes: 58_310 },
]

export const documents: Document[] = DOCUMENT_SEED.map((doc, i) => {
  const failed = i === 3
  return {
    id: `doc_${String(i + 1).padStart(2, '0')}`,
    patientId: CURRENT_PATIENT_ID,
    ...(i === 0 ? { appointmentId: 'apt_06' } : {}),
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    status: failed ? 'failed' : 'uploaded',
    uploadedAt: failed ? null : iso(at(-int(2, 50), int(9, 17))),
    ...(failed ? { failureReason: 'Upload interrupted. Retry to continue.' } : {}),
  }
})

// Chat (3 conversations, ~10 messages each)

const CONVERSATION_SCRIPTS: ReadonlyArray<
  ReadonlyArray<{ from: 'patient' | 'provider'; body: string }>
> = [
  [
    {
      from: 'patient',
      body: 'Hello, I wanted to ask about the blood pressure readings I sent through.',
    },
    {
      from: 'provider',
      body: 'Good morning. I have them in front of me — the morning readings are running a little high.',
    },
    { from: 'patient', body: 'Should I be worried about the 148/92 on Tuesday?' },
    {
      from: 'provider',
      body: 'A single reading at that level is not alarming on its own, but the pattern over two weeks is worth acting on.',
    },
    { from: 'patient', body: 'What would you suggest?' },
    {
      from: 'provider',
      body: 'Keep logging twice a day, and let us bring your review forward to this week so we can look at the trend together.',
    },
    { from: 'patient', body: 'That works. Are mornings or afternoons better for you?' },
    {
      from: 'provider',
      body: 'Mornings before ten are easiest. I have opened a slot on Thursday.',
    },
    { from: 'patient', body: 'Booked. Thank you.' },
    { from: 'provider', body: 'See you Thursday. Bring the log with you.' },
  ],
  [
    {
      from: 'patient',
      body: 'The rash on my forearms has not improved after a week of the cream.',
    },
    {
      from: 'provider',
      body: 'Thanks for updating me. Is it spreading, or staying in the same area?',
    },
    { from: 'patient', body: 'Staying roughly the same, maybe slightly more red.' },
    { from: 'provider', body: 'Any new soaps, detergents or gloves in that time?' },
    { from: 'patient', body: 'I started using a new washing powder about two weeks ago.' },
    {
      from: 'provider',
      body: 'That is a likely trigger. Switch back to your previous brand for two weeks.',
    },
    { from: 'patient', body: 'Should I keep using the cream meanwhile?' },
    {
      from: 'provider',
      body: 'Yes, continue it twice daily. If there is no change in ten days, send me a photo.',
    },
    { from: 'patient', body: 'Will do.' },
    { from: 'provider', body: 'Perfect. I will check in next week if I have not heard from you.' },
  ],
  [
    { from: 'patient', body: 'I have been having trouble falling asleep for about three weeks.' },
    {
      from: 'provider',
      body: 'Sorry to hear that. How many hours are you getting on a typical night?',
    },
    { from: 'patient', body: 'Maybe four or five. I wake up around three most nights.' },
    {
      from: 'provider',
      body: 'Are you going to bed at a consistent time, and is there screen use late in the evening?',
    },
    {
      from: 'patient',
      body: 'Fairly consistent, but I am on my laptop until midnight most nights.',
    },
    {
      from: 'provider',
      body: 'That is a good place to start. Try stopping screens an hour before bed for a week.',
    },
    { from: 'patient', body: 'And if that does not help?' },
    {
      from: 'provider',
      body: 'Then we would look at sleep hygiene more formally and consider a referral.',
    },
    { from: 'patient', body: 'Understood.' },
    {
      from: 'provider',
      body: 'Keep a short sleep diary this week and we will review it together.',
    },
  ],
]

export const conversations: Conversation[] = []
export const messages: ChatMessage[] = []

CONVERSATION_SCRIPTS.forEach((script, c) => {
  const provider = providers[c * 7 + 2] ?? providers[0]
  if (!provider) throw new Error('providers seed is empty')

  const conversationId = `cnv_${String(c + 1).padStart(2, '0')}`
  // Most recent conversation is the freshest; older ones trail further back.
  const startMs = at(-(c * 2 + 1), 9, 15)

  script.forEach((entry, m) => {
    const senderId = entry.from === 'patient' ? CURRENT_PATIENT_ID : provider.id
    // Everything except the tail of the newest conversation is already read.
    const isRecent = c === 0 && m >= script.length - 2
    messages.push({
      id: `msg_${c + 1}_${String(m + 1).padStart(2, '0')}`,
      conversationId,
      senderId,
      senderRole: entry.from,
      body: entry.body,
      sentAt: iso(startMs + m * 7 * 60_000),
      status: isRecent ? (m === script.length - 1 ? 'delivered' : 'sent') : 'read',
    })
  })

  const mine = messages.filter((m) => m.conversationId === conversationId)
  const last = mine[mine.length - 1]
  if (!last) throw new Error(`conversation ${conversationId} produced no messages`)

  conversations.push({
    id: conversationId,
    patientId: CURRENT_PATIENT_ID,
    providerId: provider.id,
    lastMessageAt: last.sentAt,
    lastMessagePreview: last.body.slice(0, 80),
    unreadCount: c === 0 ? 1 : 0,
  })
})

// Derived: nextAvailableAt

// Two providers genuinely have nothing free, so consumers exercise the
// `nextAvailableAt: null` branch from docs/domain.ts ("null = no availability
// in the next N days"). Their slots are blocked first, so `null` and the slot
// data agree rather than contradicting each other.
for (const index of NO_AVAILABILITY_INDEXES) {
  for (const slot of slots) {
    if (slot.providerId === providers[index]?.id) slot.status = 'blocked'
  }
}

for (const provider of providers) {
  const next = slots
    .filter(
      (s) =>
        s.providerId === provider.id &&
        s.status === 'available' &&
        Date.parse(s.start) > Date.now(),
    )
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0]
  provider.nextAvailableAt = next?.start ?? null
}

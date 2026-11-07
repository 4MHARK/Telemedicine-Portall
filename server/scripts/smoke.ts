// End-to-end smoke test. Run after deploy (or locally) with:
//
//   SEED_SECRET=... npm run smoke
//   SMOKE_BASE_URL=https://your-app.onrender.com SEED_SECRET=... npm run smoke
//
// It exercises every route the frontend calls, asserts the status and shape,
// and prints a PASS/FAIL checklist that can be screenshotted.

const BASE_URL = process.env.SMOKE_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`
const EMAIL = process.env.SMOKE_EMAIL ?? 'nadia.okafor@example.com'
const OTHER_EMAIL = process.env.SMOKE_OTHER_EMAIL ?? 'tomas.silva@example.com'
const PASSWORD = process.env.SMOKE_PASSWORD ?? process.env.DEMO_PASSWORD ?? 'demo-password-2026'
const SEED_SECRET = process.env.SEED_SECRET ?? ''

interface ApiError {
  code: string
  message: string
  fieldErrors?: Record<string, string[]>
}

interface Patient {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  avatarUrl?: string
  insuranceProvider?: string
  insuranceMemberId?: string
}

interface AuthSession {
  token: string // the tm_session cookie value, kept as a jar
  patient: Patient
  account: { id: string; email: string; role: string; isActive: boolean }
}

interface Specialty {
  id: string
  name: string
  slug: string
  icon: string
}

interface Provider {
  id: string
  firstName: string
  lastName: string
  title: string
  specialtyIds: string[]
  bio: string
  avatarUrl: string
  yearsExperience: number
  rating: number
  reviewCount: number
  languages: string[]
  consultationTypes: string[]
  nextAvailableAt: string | null
}

interface ProviderPage {
  items: Provider[]
  page: number
  pageSize: number
  total: number
  hasNext: boolean
}

interface Slot {
  id: string
  providerId: string
  start: string
  end: string
  status: 'available' | 'booked' | 'blocked'
}

interface Appointment {
  id: string
  patientId: string
  providerId: string
  slotId: string
  consultationType: string
  status: string
  reason: string
  scheduledAt: string
  durationMinutes: number
  createdAt: string
  cancelledAt?: string
  cancelReason?: string
}

interface DocumentRow {
  id: string
  patientId: string
  appointmentId?: string
  fileName: string
  mimeType: string
  sizeBytes: number
  status: string
  uploadedAt: string | null
}

interface Conversation {
  id: string
  patientId: string
  providerId: string
  lastMessageAt: string
  lastMessagePreview: string
  unreadCount: number
}

interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  senderRole: string
  body: string
  sentAt: string
  status: string
}

interface SeedResult {
  status: string
  specialties: number
  providers: number
  slots: number
  patients: number
  appointments: number
  documents: number
  conversations: number
  messages: number
}

interface Result<T = unknown> {
  status: number
  body: T | ApiError | null
  setCookie?: string
}

let passed = 0
let failed = 0
let skipped = 0

const green = '\u001b[32m'
const red = '\u001b[31m'
const yellow = '\u001b[33m'
const dim = '\u001b[2m'
const off = '\u001b[0m'

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    passed += 1
    console.log(`${green}PASS${off}  ${name}`)
  } else {
    failed += 1
    console.log(`${red}FAIL${off}  ${name}${detail ? ` ${dim}(${detail})${off}` : ''}`)
  }
}

function skip(name: string, reason: string): void {
  skipped += 1
  console.log(`${yellow}SKIP${off}  ${name} ${dim}(${reason})${off}`)
}

async function call<T>(
  method: string,
  path: string,
  options: {
    token?: string
    body?: unknown
    form?: FormData
    headers?: Record<string, string>
  } = {},
): Promise<Result<T>> {
  const headers: Record<string, string> = { ...options.headers }
  if (options.token) headers.Cookie = options.token

  let body: string | FormData | undefined
  if (options.form) {
    body = options.form
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  const response = await fetch(`${BASE_URL}${path}`, { method, headers, body })
  const text = await response.text()

  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }
  }

  const setCookie = response.headers.getSetCookie()[0]
  return {
    status: response.status,
    body: parsed as T | ApiError | null,
    ...(setCookie ? { setCookie } : {}),
  }
}

function errorCode(result: Result): string {
  const body = result.body
  if (typeof body !== 'object' || body === null || !('code' in body)) return ''
  return typeof body.code === 'string' ? body.code : ''
}

function slotWindow(days = 14): string {
  const now = Date.now()
  const params = new URLSearchParams({
    from: new Date(now).toISOString(),
    to: new Date(now + days * 86_400_000).toISOString(),
  })
  return params.toString()
}

async function login(email: string, password: string): Promise<AuthSession | null> {
  const result = await call<AuthSession>('POST', '/api/auth/login', {
    body: { email, password },
  })
  if (result.status !== 200 || !result.setCookie) return null
  const body = result.body as AuthSession
  return {
    token: result.setCookie.split(';')[0] ?? '',
    patient: body.patient,
    account: body.account,
  }
}

async function main(): Promise<void> {
  console.log(`Smoke test against ${BASE_URL}\n`)

  // 0. Optional reset, so the assertions below start from known data.
  if (SEED_SECRET) {
    const seed = await call<SeedResult>('POST', '/api/seed', {
      headers: { 'x-seed-secret': SEED_SECRET },
    })
    check(
      'POST /api/seed resets the demo data',
      seed.status === 200 && (seed.body as SeedResult).specialties === 12,
      `status ${seed.status}`,
    )
  } else {
    skip('POST /api/seed resets the demo data', 'SEED_SECRET is not set')
  }

  // 1. Health
  const health = await call<{ status: string }>('GET', '/health')
  check(
    'GET /health returns 200 {status:"ok"}',
    health.status === 200 && (health.body as { status: string }).status === 'ok',
    `status ${health.status}`,
  )

  // 2. Auth
  const badLogin = await call<ApiError>('POST', '/api/auth/login', {
    body: { email: EMAIL, password: 'definitely-wrong' },
  })
  check(
    'POST /api/auth/login rejects a wrong password with 401 INVALID_CREDENTIALS',
    badLogin.status === 401 && errorCode(badLogin) === 'INVALID_CREDENTIALS',
    `status ${badLogin.status} code ${errorCode(badLogin)}`,
  )

  const session = await login(EMAIL, PASSWORD)
  check(
    'POST /api/auth/login returns a session cookie and the patient',
    session !== null && session.token.length > 0 && session.patient.email === EMAIL,
    `status ${session ? 200 : 'failed'}`,
  )

  if (!session) {
    console.log('\nCannot continue without a session.')
    return
  }

  const token = session.token

  const meWithoutToken = await call<ApiError>('GET', '/api/auth/me')
  check(
    'GET /api/auth/me without a token returns 401 UNAUTHORIZED',
    meWithoutToken.status === 401 && errorCode(meWithoutToken) === 'UNAUTHORIZED',
    `status ${meWithoutToken.status}`,
  )

  const me = await call<AuthSession>('GET', '/api/auth/me', { token })
  check(
    'GET /api/auth/me returns the signed-in patient',
    me.status === 200 && (me.body as AuthSession).patient?.id === session.patient.id,
    `status ${me.status}`,
  )

  const errorShape = meWithoutToken.body as ApiError
  check(
    'errors use {code, message}, not {error:{...}}',
    typeof errorShape.code === 'string' && typeof errorShape.message === 'string',
    'top-level code/message',
  )

  // 3. Specialties
  const specialties = await call<Specialty[]>('GET', '/api/specialties')
  const specialtyList = (specialties.body as Specialty[]) ?? []
  check(
    'GET /api/specialties returns 12 specialties',
    specialties.status === 200 && specialtyList.length === 12,
    `status ${specialties.status} count ${specialtyList.length}`,
  )

  const cardiology = specialtyList.find((item) => item.slug === 'cardiology')

  // 4. Providers
  const providers = await call<ProviderPage>('GET', '/api/providers')
  const providerPage = providers.body as ProviderPage
  check(
    'GET /api/providers returns page 1 of 40 (12 per page)',
    providers.status === 200 &&
      providerPage.items.length === 12 &&
      providerPage.total === 40 &&
      providerPage.hasNext === true,
    `status ${providers.status} total ${providerPage.total}`,
  )

  const filtered = await call<ProviderPage>('GET', '/api/providers?specialty=cardiology')
  const filteredPage = filtered.body as ProviderPage
  check(
    'GET /api/providers?specialty=cardiology returns only cardiology providers',
    filtered.status === 200 &&
      cardiology !== undefined &&
      filteredPage.items.length > 0 &&
      filteredPage.items.every((provider) => provider.specialtyIds.includes(cardiology.id)),
    `status ${filtered.status} count ${filteredPage.items.length}`,
  )

  const noMatch = await call<ProviderPage>('GET', '/api/providers?q=zzzzzzzz')
  check(
    'GET /api/providers?q=… matches name + bio and can return zero',
    noMatch.status === 200 && (noMatch.body as ProviderPage).total === 0,
    `status ${noMatch.status}`,
  )

  const provider = await call<Provider>('GET', '/api/providers/prv_01')
  const providerBody = provider.body as Provider
  check(
    'GET /api/providers/prv_01 returns the seeded provider',
    provider.status === 200 &&
      providerBody.id === 'prv_01' &&
      Array.isArray(providerBody.specialtyIds) &&
      providerBody.specialtyIds.length > 0,
    `status ${provider.status}`,
  )

  const missingProvider = await call<ApiError>('GET', '/api/providers/nope')
  check(
    'GET /api/providers/:id returns 404 NOT_FOUND for an unknown id',
    missingProvider.status === 404 && errorCode(missingProvider) === 'NOT_FOUND',
    `status ${missingProvider.status}`,
  )

  const slotsResult = await call<Slot[]>('GET', `/api/providers/prv_01/slots?${slotWindow()}`)
  const slotList = (slotsResult.body as Slot[]) ?? []
  const availableSlot = slotList.find((slot) => slot.status === 'available')
  check(
    'GET /api/providers/:id/slots returns availability',
    slotsResult.status === 200 && slotList.length > 0 && availableSlot !== undefined,
    `status ${slotsResult.status} slots ${slotList.length}`,
  )

  const missingSlotQuery = await call<ApiError>('GET', '/api/providers/prv_01/slots')
  check(
    'GET /api/providers/:id/slots without from/to returns 422 with fieldErrors',
    missingSlotQuery.status === 422 &&
      errorCode(missingSlotQuery) === 'VALIDATION' &&
      (missingSlotQuery.body as ApiError).fieldErrors?.from !== undefined &&
      (missingSlotQuery.body as ApiError).fieldErrors?.to !== undefined,
    `status ${missingSlotQuery.status}`,
  )

  // 5. Appointments
  const appointmentsWithoutToken = await call<ApiError>('GET', '/api/appointments')
  check(
    'GET /api/appointments without a token returns 401',
    appointmentsWithoutToken.status === 401,
    `status ${appointmentsWithoutToken.status}`,
  )

  const appointments = await call<Appointment[]>('GET', '/api/appointments', { token })
  const appointmentList = (appointments.body as Appointment[]) ?? []
  check(
    'GET /api/appointments returns the 8 seeded appointments',
    appointments.status === 200 && appointmentList.length === 8,
    `status ${appointments.status} count ${appointmentList.length}`,
  )

  const scheduled = await call<Appointment[]>('GET', '/api/appointments?status=scheduled', {
    token,
  })
  const scheduledList = (scheduled.body as Appointment[]) ?? []
  check(
    'GET /api/appointments?status=scheduled returns only scheduled visits',
    scheduled.status === 200 &&
      scheduledList.length > 0 &&
      scheduledList.every((appointment) => appointment.status === 'scheduled'),
    `status ${scheduled.status} count ${scheduledList.length}`,
  )

  if (!availableSlot) {
    console.log('\nNo available slot; cannot exercise booking.')
    return
  }

  const invalidBooking = await call<ApiError>('POST', '/api/appointments', {
    token,
    body: { providerId: 'prv_01' },
  })
  check(
    'POST /api/appointments with a missing body returns 422 VALIDATION',
    invalidBooking.status === 422 && errorCode(invalidBooking) === 'VALIDATION',
    `status ${invalidBooking.status}`,
  )

  const booking = await call<Appointment>('POST', '/api/appointments', {
    token,
    body: {
      providerId: 'prv_01',
      slotId: availableSlot.id,
      consultationType: 'video',
      reason: 'Smoke test booking',
    },
  })
  const booked = booking.body as Appointment
  check(
    'POST /api/appointments holds an available slot (201 pending_payment)',
    booking.status === 201 &&
      booked.status === 'pending_payment' &&
      booked.slotId === availableSlot.id &&
      booked.patientId === session.patient.id,
    `status ${booking.status}`,
  )

  const duplicateBooking = await call<ApiError>('POST', '/api/appointments', {
    token,
    body: {
      providerId: 'prv_01',
      slotId: availableSlot.id,
      consultationType: 'video',
      reason: 'Smoke test duplicate',
    },
  })
  check(
    'POST /api/appointments on the same slot returns 409 SLOT_TAKEN',
    duplicateBooking.status === 409 && errorCode(duplicateBooking) === 'SLOT_TAKEN',
    `status ${duplicateBooking.status}`,
  )

  const initialized = await call<{
    payment: { reference: string; accessCode?: string }
    appointment: Appointment
  }>('POST', '/api/payments/initialize', {
    token,
    body: { appointmentId: booked.id },
  })
  const initBody = initialized.body as {
    payment: { reference: string; accessCode?: string }
  }
  check(
    'POST /api/payments/initialize returns an access code for the held slot',
    initialized.status === 200 &&
      typeof initBody.payment?.reference === 'string' &&
      typeof initBody.payment?.accessCode === 'string',
    `status ${initialized.status}`,
  )

  if (process.env.PAYSTACK_FAKE === 'true' && initialized.status === 200) {
    const verified = await call<{ payment: { status: string }; appointment: Appointment }>(
      'POST',
      '/api/payments/verify',
      { token, body: { reference: initBody.payment.reference } },
    )
    const verifiedBody = verified.body as {
      payment: { status: string }
      appointment: Appointment
    }
    check(
      'POST /api/payments/verify confirms the appointment with the fake provider',
      verified.status === 200 &&
        verifiedBody.payment?.status === 'succeeded' &&
        verifiedBody.appointment?.status === 'scheduled',
      `status ${verified.status}`,
    )
  } else {
    skip(
      'POST /api/payments/verify confirms the appointment',
      'PAYSTACK_FAKE is not true; use a real test transaction or the fake provider',
    )
  }

  const otherSession = await login(OTHER_EMAIL, PASSWORD)
  check('A second seeded patient can sign in', otherSession !== null, EMAIL)

  if (otherSession) {
    const forbiddenRead = await call<ApiError>('GET', `/api/appointments/${booked.id}`, {
      token: otherSession.token,
    })
    check(
      'GET /api/appointments/:id for another patient returns 403 FORBIDDEN',
      forbiddenRead.status === 403 && errorCode(forbiddenRead) === 'FORBIDDEN',
      `status ${forbiddenRead.status}`,
    )
  }

  const cancel = await call<Appointment>('PATCH', `/api/appointments/${booked.id}`, {
    token,
    body: { status: 'cancelled', cancelReason: 'Smoke test' },
  })
  check(
    'PATCH /api/appointments/:id cancels the held or scheduled visit',
    cancel.status === 200 && (cancel.body as Appointment).status === 'cancelled',
    `status ${cancel.status}`,
  )

  const cancelAgain = await call<ApiError>('PATCH', `/api/appointments/${booked.id}`, {
    token,
    body: { status: 'cancelled' },
  })
  check(
    'PATCH /api/appointments/:id on a cancelled visit returns 409',
    cancelAgain.status === 409,
    `status ${cancelAgain.status}`,
  )

  const slotsAfterCancel = await call<Slot[]>('GET', `/api/providers/prv_01/slots?${slotWindow()}`)
  const freedSlot = (slotsAfterCancel.body as Slot[]).find((slot) => slot.id === availableSlot.id)
  check(
    'Cancelling frees the slot again',
    slotsAfterCancel.status === 200 && freedSlot?.status === 'available',
    `status ${freedSlot?.status ?? 'missing'}`,
  )

  // 6. Documents
  const documentsWithoutToken = await call<ApiError>('GET', '/api/documents')
  check(
    'GET /api/documents without a token returns 401',
    documentsWithoutToken.status === 401,
    `status ${documentsWithoutToken.status}`,
  )

  const documents = await call<DocumentRow[]>('GET', '/api/documents', { token })
  const seededDocuments = (documents.body as DocumentRow[]) ?? []
  check(
    'GET /api/documents returns the 6 seeded documents',
    documents.status === 200 && seededDocuments.length === 6,
    `status ${documents.status} count ${seededDocuments.length}`,
  )

  const form = new FormData()
  form.append(
    'file',
    new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], { type: 'application/pdf' }),
    'smoke-test.pdf',
  )
  form.append('appointmentId', 'apt_01')
  const upload = await call<DocumentRow>('POST', '/api/documents', { token, form })
  const uploaded = upload.body as DocumentRow
  check(
    'POST /api/documents stores a PDF and links it to an appointment',
    upload.status === 201 &&
      uploaded.fileName === 'smoke-test.pdf' &&
      uploaded.status === 'uploaded' &&
      uploaded.appointmentId === 'apt_01',
    `status ${upload.status}`,
  )

  const wrongType = new FormData()
  wrongType.append('file', new Blob(['hello'], { type: 'text/plain' }), 'notes.txt')
  const unsupported = await call<ApiError>('POST', '/api/documents', { token, form: wrongType })
  check(
    'POST /api/documents rejects a disallowed MIME type with 415',
    unsupported.status === 415 && errorCode(unsupported) === 'UNSUPPORTED_TYPE',
    `status ${unsupported.status}`,
  )

  if (uploaded?.id) {
    const remove = await call<void>('DELETE', `/api/documents/${uploaded.id}`, { token })
    check('DELETE /api/documents/:id returns 204', remove.status === 204, `status ${remove.status}`)

    const removeAgain = await call<ApiError>('DELETE', `/api/documents/${uploaded.id}`, { token })
    check(
      'DELETE /api/documents/:id on a missing id returns 404',
      removeAgain.status === 404 && errorCode(removeAgain) === 'NOT_FOUND',
      `status ${removeAgain.status}`,
    )
  }

  if (otherSession) {
    const otherDocuments = await call<DocumentRow[]>('GET', '/api/documents', {
      token: otherSession.token,
    })
    check(
      "Another patient cannot see Nadia's documents",
      otherDocuments.status === 200 && (otherDocuments.body as DocumentRow[]).length === 0,
      `status ${otherDocuments.status}`,
    )
  }

  // 7. Chat
  const conversationsWithoutToken = await call<ApiError>('GET', '/api/conversations')
  check(
    'GET /api/conversations without a token returns 401',
    conversationsWithoutToken.status === 401,
    `status ${conversationsWithoutToken.status}`,
  )

  const conversations = await call<Conversation[]>('GET', '/api/conversations', { token })
  const conversationList = (conversations.body as Conversation[]) ?? []
  check(
    'GET /api/conversations returns the seeded conversations',
    conversations.status === 200 && conversationList.length >= 3,
    `status ${conversations.status} count ${conversationList.length}`,
  )

  // Prefer the known seeded thread; the payment test above creates an empty
  // conversation with a newer timestamp.
  const conversationId =
    conversationList.find((conversation) => conversation.id === 'cnv_01')?.id ??
    conversationList[0]?.id
  if (!conversationId) {
    console.log('\nNo conversation to exercise chat against.')
    return
  }

  const messages = await call<ChatMessage[]>(
    'GET',
    `/api/conversations/${conversationId}/messages`,
    { token },
  )
  check(
    'GET /api/conversations/:id/messages returns the seeded transcript',
    messages.status === 200 && ((messages.body as ChatMessage[]) ?? []).length === 10,
    `status ${messages.status}`,
  )

  const send = await call<ChatMessage>('POST', `/api/conversations/${conversationId}/messages`, {
    token,
    body: { body: 'Smoke test message' },
  })
  const sent = send.body as ChatMessage
  check(
    'POST /api/conversations/:id/messages stores a sent message',
    send.status === 201 &&
      sent.senderRole === 'patient' &&
      sent.status === 'sent' &&
      sent.body === 'Smoke test message',
    `status ${send.status}`,
  )

  const emptyMessage = await call<ApiError>(
    'POST',
    `/api/conversations/${conversationId}/messages`,
    { token, body: { body: '   ' } },
  )
  check(
    'POST /api/conversations/:id/messages rejects an empty body with 422',
    emptyMessage.status === 422 && errorCode(emptyMessage) === 'VALIDATION',
    `status ${emptyMessage.status}`,
  )

  if (otherSession) {
    const forbiddenMessages = await call<ApiError>(
      'GET',
      `/api/conversations/${conversationId}/messages`,
      { token: otherSession.token },
    )
    check(
      'GET /api/conversations/:id/messages for another patient returns 403',
      forbiddenMessages.status === 403,
      `status ${forbiddenMessages.status}`,
    )
  }

  // The seeded cnv_01 belongs to prv_03; that doctor can reply through the
  // same role-aware endpoint the portal uses.
  const doctorSession = await login('dr.daniel.silva.prv_03@doctors.example', PASSWORD)
  if (doctorSession) {
    const doctorReply = await call<ChatMessage>(
      'POST',
      `/api/conversations/${conversationId}/messages`,
      { token: doctorSession.token, body: { body: 'Doctor smoke reply' } },
    )
    check(
      'A doctor can reply in the conversation',
      doctorReply.status === 201 && (doctorReply.body as ChatMessage).senderRole === 'provider',
      `status ${doctorReply.status}`,
    )

    const after = await call<ChatMessage[]>(
      'GET',
      `/api/conversations/${conversationId}/messages?after=${encodeURIComponent(sent.sentAt)}`,
      { token },
    )
    const replies = (after.body as ChatMessage[]) ?? []
    check(
      'The patient poll sees the doctor reply',
      after.status === 200 && replies.some((message) => message.senderRole === 'provider'),
      `status ${after.status} replies ${replies.length}`,
    )
  } else {
    skip('A doctor can reply in the conversation', 'doctor login failed')
  }

  // 8. Unknown route
  const unknown = await call<ApiError>('GET', '/api/nope')
  check(
    'An unknown route returns 404 NOT_FOUND in the shared error shape',
    unknown.status === 404 && errorCode(unknown) === 'NOT_FOUND',
    `status ${unknown.status}`,
  )

  // 9. Seed endpoint gating, then reset.
  if (SEED_SECRET) {
    const noSecret = await call<ApiError>('POST', '/api/seed')
    check(
      'POST /api/seed without the secret returns 401',
      noSecret.status === 401,
      `status ${noSecret.status}`,
    )

    const wrongSecret = await call<ApiError>('POST', '/api/seed', {
      headers: { 'x-seed-secret': 'wrong' },
    })
    check(
      'POST /api/seed with the wrong secret returns 401',
      wrongSecret.status === 401,
      `status ${wrongSecret.status}`,
    )

    const reseed = await call<SeedResult>('POST', '/api/seed', {
      headers: { 'x-seed-secret': SEED_SECRET },
    })
    check(
      'POST /api/seed resets the data after the smoke run',
      reseed.status === 200 && (reseed.body as SeedResult).appointments === 8,
      `status ${reseed.status}`,
    )
  } else {
    skip('POST /api/seed gating', 'SEED_SECRET is not set')
  }
}

main()
  .catch((error: unknown) => {
    console.error('\nSmoke test crashed.', error)
    process.exitCode = 1
  })
  .finally(() => {
    const total = passed + failed
    console.log(`\n${passed}/${total} checks passed, ${failed} failed, ${skipped} skipped.`)
    if (failed > 0) process.exitCode = 1
  })

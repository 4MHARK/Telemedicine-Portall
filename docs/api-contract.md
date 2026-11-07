# API Contract

Base URL: `/api`
Content type: `application/json` except uploads (`multipart/form-data`).
Auth: an HTTP-only `tm_session` cookie on every route except `/auth/*`,
`/specialties`, and `/providers*`. The public data endpoints are required by the
public `/doctors` routes (decisions.md row 20). `POST /payments/webhook` is
authenticated by its HMAC signature instead.
Errors: always `ApiErrorBody` shape with the correct HTTP status.

## Auth

Session responses are `{ account, patient? , provider? }`. `account` is
`{ id, email, role: 'patient' | 'doctor', isActive }`. The cookie is set by the
server; JavaScript never receives a token.

### `POST /auth/register`
- **Req:** `{ email, password, firstName, lastName, phone, dateOfBirth }`
- **Res 201:** `AuthSession` + `Set-Cookie: tm_session=...`
- **Res 409:** `EMAIL_TAKEN`
- **Res 422:** `VALIDATION` with field errors

### `POST /auth/login`
- **Req:** `{ email: string, password: string }`
- **Res 200:** `AuthSession` + session cookie
- **Res 401:** `{ code: "INVALID_CREDENTIALS", message }`
- **Roles:** patient and doctor use the same form; the response's `account.role`
  decides the landing page.

### `POST /auth/logout`
- **Res 204**; revokes the session row and clears the cookie.

### `GET /auth/me`
- **Res 200:** `AuthSession`
- **Res 401:** if the cookie is missing / invalid / expired / revoked
- **Used on boot** to rehydrate session; route loaders also call it.

## Specialties

### `GET /specialties`
- **Res 200:** `Specialty[]`
- **Mock:** ~12 specialties, stable across reloads.

## Providers

### `GET /providers`
- **Query params:**
  - `q?: string` — free-text search on name + bio
  - `specialty?: string` — repeated, specialty slugs
  - `availability?: "now" | "today" | "week"`
  - `consultationType?: "video" | "phone" | "async"`
  - `page?: number` (default 1)
  - `pageSize?: number` (default 12, max 50)
- **Res 200:** `Paginated<Provider>`

### `GET /providers/:id`
- **Res 200:** `Provider`
- **Res 404:** `{ code: "NOT_FOUND", message }`

### `GET /providers/:id/slots`
- **Query params:** `from: ISODateString`, `to: ISODateString` (required)
- **Res 200:** `AvailabilitySlot[]`

## Appointments

### `POST /appointments`
- **Req:** `{ providerId, slotId, consultationType, reason }`
- **Res 201:** `Appointment`
- **Res 409:** `{ code: "SLOT_TAKEN", message }` — if slot already booked
- **Res 422:** `{ code: "VALIDATION", fieldErrors }`

### `GET /appointments`
- **Query params:** `status?: AppointmentStatus`
- **Res 200:** `Appointment[]`

### `GET /appointments/:id`
- **Res 200:** `Appointment`
- **Res 403 / 404:** if not owned by current patient

### `PATCH /appointments/:id`
- **Req:** `{ status: "cancelled", cancelReason?: string }`
- **Res 200:** `Appointment`
- **Res 409:** if status transition invalid

## Documents

### `GET /documents`
- **Res 200:** `Document[]` (current patient only)

### `POST /documents`
- **Content-Type:** `multipart/form-data`
- **Fields:** `file` (required), `appointmentId?` (optional)
- **Res 201:** `Document` (status `uploaded`)
- **Res 404:** `appointmentId` does not exist
- **Res 403:** `appointmentId` belongs to another patient
- **Res 413:** file too large (> 10 MB)
- **Res 415:** mime type not allowed (`application/pdf`, `image/png`, `image/jpeg`)
- **Transport:** XHR only. MSW cannot emit real upload progress — the client emits synthetic ticks in DEV.
- **Mock failure:** any file whose name starts with `fail-` returns 500 once per session.

### `DELETE /documents/:id`
- **Res 204**

## Chat

### `GET /conversations`
- **Res 200:** `Conversation[]`
- **Polling:** `refetchInterval: 10_000`, `refetchIntervalInBackground: false`

### `GET /conversations/:id/messages`
- **Query params:** `after?: ISODateString` — return only messages with `sentAt > after`
- **Res 200:** `ChatMessage[]`
- **Polling:** `refetchInterval: 3_000`, `refetchIntervalInBackground: false`
- **Merge rule:** merge by `ChatMessage.id`; never replace. Server messages win. Local `sending` messages with no server twin are preserved.

### `POST /conversations/:id/messages`
- **Req:** `{ body: string }`
- **Res 201:** `ChatMessage`
- **Live:** a signed-in doctor replies through the same endpoint; the patient
  sees it on the next poll. There is no simulated auto-reply.

## Payments

### `POST /payments/initialize`
- **Auth:** patient session
- **Req:** `{ appointmentId: string }`
- **Res 200:** `{ payment: Payment, appointment: Appointment }`; the payment
  carries `accessCode` for the Paystack inline popup.
- **Res 409:** `HOLD_EXPIRED` / `PAYMENT_ALREADY_SUCCEEDED`

### `POST /payments/verify`
- **Auth:** patient session; the payment must belong to that patient
- **Req:** `{ reference: string }`
- **Res 200:** `{ payment: Payment, appointment: Appointment }`
- **Res 409:** `PAYMENT_MISMATCH` if amount or currency differs

### `POST /payments/webhook`
- **Auth:** `x-paystack-signature` = HMAC-SHA512 of the raw body with the
  Paystack secret key
- **Res 200:** verified event accepted; duplicate settlement is a no-op
- **Res 401:** invalid signature

### `GET /payments/:reference`
- **Auth:** patient session; own payment only

## Provider portal

All routes require a doctor session. A patient receives `403 FORBIDDEN`.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/provider/me` | own profile, fees, account email |
| `PATCH` | `/provider/me` | title, bio, languages, consultation types |
| `GET` | `/provider/fees` | current consultation prices |
| `PUT` | `/provider/fees` | `{ fees: [{ consultationType, amountMinor }] }` |
| `GET` | `/provider/slots?from&to` | own slots, including booked |
| `POST` | `/provider/slots` | `{ start, end }`; future, 15–120 minutes |
| `DELETE` | `/provider/slots/:id` | only an unbooked slot |
| `GET` | `/provider/appointments` | own appointments with `patientName` |
| `PATCH` | `/provider/appointments/:id` | `{ status: "completed" \| "no_show", notes? }` |

## Simulated Conditions (DEV)

| Condition | Where | Effect |
|---|---|---|
| Latency | all handlers | 200–600 ms random delay |
| Slot collision | `POST /appointments` | 409 if `slotId` already booked |
| Upload failure | `POST /documents` | 500 if `fileName.startsWith('fail-')` (once per session) |
| Expired token | `GET /auth/me`, any protected route | 401 → global handler clears session + redirects |
| Provider reply | `POST /conversations/:id/messages` | a provider message appears on the next poll |

## Error Codes

| Code | Meaning |
|---|---|
| `UNAUTHORIZED` | missing / invalid / expired token |
| `FORBIDDEN` | valid token, resource not owned |
| `NOT_FOUND` | resource doesn't exist |
| `VALIDATION` | request body failed schema validation; includes `fieldErrors` |
| `SLOT_TAKEN` | appointment slot already booked |
| `FILE_TOO_LARGE` | upload exceeds 10 MB |
| `UNSUPPORTED_TYPE` | upload mime type not allowed |
| `INTERNAL` | simulated server failure |
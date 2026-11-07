# Telemedicine Portal — API

Express 5 + TypeScript + Prisma + PostgreSQL backend for the portal in the
repository root. It now serves the live patient **and** doctor experience:

- Account creation, login, logout, and HTTP-only session cookies.
- Seeded doctor accounts with profile, per-consultation-type fees, availability,
  appointments, and real persisted replies.
- Patient booking with a 10-minute payment hold.
- Paystack test-mode initialization, server-side verification, and webhook
  reconciliation with idempotent settlement.
- The existing specialties, provider directory, documents, and messaging
  contract.

The wire contract is `docs/api-contract.md` plus `src/types/*.ts`. Enum values
are uppercase in PostgreSQL and lowercased by `src/lib/serialize.ts`.

## Accounts

### Patients

All seeded patients use the same password. New patients register at
`POST /api/auth/register`.

| Patient                 | Email                      | Password             |
| ----------------------- | -------------------------- | -------------------- |
| Nadia Okafor (`pat_01`) | `nadia.okafor@example.com` | `demo-password-2026` |
| Tomas Silva (`pat_02`)  | `tomas.silva@example.com`  | `demo-password-2026` |
| Mei Chen (`pat_03`)     | `mei.chen@example.com`     | `demo-password-2026` |

### Doctors

Every seeded provider has an account. The email pattern is:

```text
dr.<first>.<last>.<provider-id>@doctors.example
```

Examples:

| Doctor           | Email                                    | Password             |
| ---------------- | ---------------------------------------- | -------------------- |
| Dr. Amara Okafor | `dr.amara.okafor.prv_01@doctors.example` | `demo-password-2026` |
| Dr. Daniel Silva | `dr.daniel.silva.prv_03@doctors.example` | `demo-password-2026` |

Override the seeded passwords with `DEMO_PASSWORD` and
`DEMO_PROVIDER_PASSWORD` before running `npm run seed`. These are demo
credentials, not production data.

## API surface

| Method   | Path                              | Auth            | Notes                                    |
| -------- | --------------------------------- | --------------- | ---------------------------------------- |
| `POST`   | `/api/auth/register`              | public          | patient account + session cookie         |
| `POST`   | `/api/auth/login`                 | public          | patient or doctor; sets `tm_session`     |
| `POST`   | `/api/auth/logout`                | public          | revokes the session, clears the cookie   |
| `GET`    | `/api/auth/me`                    | session         | `{account, patient?/provider?}`          |
| `GET`    | `/api/specialties`                | public          | 12 seeded specialties                    |
| `GET`    | `/api/providers`                  | public          | directory, filters, pagination, fees     |
| `GET`    | `/api/providers/:id`              | public          | active provider only                     |
| `GET`    | `/api/providers/:id/slots`        | public          | `from`, `to` required                    |
| `POST`   | `/api/appointments`               | patient         | creates a `pending_payment` hold         |
| `GET`    | `/api/appointments`               | patient         | own appointments                         |
| `GET`    | `/api/appointments/:id`           | patient         | ownership enforced                       |
| `PATCH`  | `/api/appointments/:id`           | patient         | cancel a hold or scheduled visit         |
| `POST`   | `/api/payments/initialize`        | patient         | creates/reuses a Paystack attempt        |
| `POST`   | `/api/payments/verify`            | patient         | verifies and settles a reference         |
| `GET`    | `/api/payments/:reference`        | patient         | own payment only                         |
| `POST`   | `/api/payments/webhook`           | signature       | HMAC-SHA512 over the raw body            |
| `GET`    | `/api/provider/me`                | doctor          | own profile + account email              |
| `PATCH`  | `/api/provider/me`                | doctor          | title, bio, languages, types             |
| `GET`    | `/api/provider/fees`              | doctor          | own consultation prices                  |
| `PUT`    | `/api/provider/fees`              | doctor          | upsert per consultation type             |
| `GET`    | `/api/provider/slots`             | doctor          | own slots, including booked              |
| `POST`   | `/api/provider/slots`             | doctor          | future 15–120 minute slot                |
| `DELETE` | `/api/provider/slots/:id`         | doctor          | only unbooked slots                      |
| `GET`    | `/api/provider/appointments`      | doctor          | own appointments                         |
| `PATCH`  | `/api/provider/appointments/:id`  | doctor          | completed or no-show                     |
| `GET`    | `/api/documents`                  | patient         | own documents                            |
| `POST`   | `/api/documents`                  | patient         | multipart, 10 MB, PDF/PNG/JPEG           |
| `DELETE` | `/api/documents/:id`              | patient         | ownership enforced                       |
| `GET`    | `/api/conversations`              | session         | role-aware: own patient/provider threads |
| `GET`    | `/api/conversations/:id/messages` | session         | participant only; marks read             |
| `POST`   | `/api/conversations/:id/messages` | session         | persisted, real doctor replies           |
| `POST`   | `/api/seed`                       | `x-seed-secret` | idempotent wipe + recreate               |
| `GET`    | `/health`                         | public          | `{status:"ok"}`                          |

Errors always use the frontend's shape:

```json
{
  "code": "VALIDATION",
  "message": "Request body failed schema validation.",
  "fieldErrors": { "reason": ["A reason is required."] }
}
```

## Local setup

Requires Node 20+ and PostgreSQL 16.

```bash
cd server
cp .env.example .env
# edit DATABASE_URL, DIRECT_URL, SEED_SECRET, and Paystack keys
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

`DIRECT_URL` is used by Prisma Migrate. Locally it is the same as
`DATABASE_URL`; on Supabase it is the session pooler while `DATABASE_URL` is the
transaction pooler.

For local UI work without Paystack, set `PAYSTACK_FAKE=true` in `server/.env`
and `VITE_PAYMENTS_FAKE=true` in the frontend environment. Both are test-only.

## Payment flow

1. `POST /api/appointments` claims the slot and creates a `PENDING_PAYMENT`
   appointment with `holdExpiresAt` (default 10 minutes).
2. `POST /api/payments/initialize` calls Paystack with the server-computed
   amount and returns the access code for the inline popup.
3. The browser completes the popup and calls `POST /api/payments/verify`.
4. The server verifies amount, currency, and status, then confirms the
   appointment in a conditional transaction and creates the conversation.
5. The Paystack webhook calls the same settlement path for duplicate or delayed
   events. A duplicate is a no-op.
6. A payment after expiry is recorded as succeeded with `refundStatus` pending;
   the slot is not revived. Refunds are only marked confirmed when Paystack
   confirms them.

## Security

- HTTP-only, SameSite=Lax session cookies; hashed session tokens in PostgreSQL.
  `__Host-` prefix and `Secure` in production.
- Session rotation on login, revocation on logout, active-session cap, expiry
  cleanup.
- bcrypt cost 12; password policy on signup; generic login errors with a dummy
  comparison for unknown accounts.
- Origin check for cookie-authenticated writes, helmet headers, and rate limits
  on auth/payment routes.
- Patient/provider ownership checks on appointments, conversations, documents,
  slots, and fees.
- Paystack webhook HMAC-SHA512 over the raw body; amount/currency verified
  server-side; duplicate settlement idempotent.
- Seed endpoint gated by a timing-safe secret; disabled in production unless
  `ALLOW_SEED=true`.

## Tests

```bash
npm run typecheck
npm run test:server
PAYSTACK_FAKE=true npm run smoke
```

The smoke suite covers sessions, role guards, booking, payment initialization
and verification, documents, real doctor replies, and seed gating.

## Deployment

- **Supabase:** use the transaction pooler (6543, `pgbouncer=true`) for
  `DATABASE_URL` and the session pooler (5432) for `DIRECT_URL`.
  Run `npx prisma migrate deploy` and `npm run seed` once.
- **Render:** build `npm ci && npx prisma migrate deploy && npm run build`,
  start `npm start`, health check `/health`. Set `NODE_ENV=production`,
  `APP_ORIGIN`, `CORS_ORIGIN`, `SESSION_TTL_DAYS`, `SESSION_IDLE_DAYS`,
  `HOLD_TTL_MINUTES`, `SEED_SECRET`, `PAYSTACK_SECRET_KEY`, and
  `PAYSTACK_FAKE=false`.
- **Webhook:** register `https://<render-host>/api/payments/webhook` in the
  Paystack test dashboard for `charge.success` and `refund.processed`.
- **Frontend:** keep `/api/*` same-origin through the Netlify/Vercel rewrite so
  the session cookie is first-party.

## Known limitations

- This is a demonstration with synthetic data and Paystack test mode; it is not
  a clinical service and does not claim regulatory compliance.
- Email verification, password reset, clinic/admin roles, video calls, and
  object storage are not implemented.
- Rate-limit counters are in-memory and therefore per Render instance.
- Doctor auto-replies are gone; a doctor must be signed in to reply.

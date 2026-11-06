# Telemedicine Portal — API

Express 5 + TypeScript + Prisma + PostgreSQL backend for the patient portal in
the repository root. It implements the contract in `docs/api-contract.md` and
`src/types/*.ts` **exactly**: same paths, same field names, same enum values,
same error envelope.

This is a patient-only portal. There is no doctor login, no signup and no
prescriptions, because the frontend has none. Those are stated as out of
current scope rather than half-built.

## Demo accounts

All three seeded patients use the same password.

| Patient                 | Email                      | Password             |
| ----------------------- | -------------------------- | -------------------- |
| Nadia Okafor (`pat_01`) | `nadia.okafor@example.com` | `demo-password-2026` |
| Tomas Silva (`pat_02`)  | `tomas.silva@example.com`  | `demo-password-2026` |
| Mei Chen (`pat_03`)     | `mei.chen@example.com`     | `demo-password-2026` |

The password is demo data, printed on the login screen on purpose. It is not a
production credential. Override it with `DEMO_PASSWORD` before seeding if you
want a different one.

## What it implements

| Method   | Path                              | Auth            | Notes                                                                                                     |
| -------- | --------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/auth/login`                 | public          | `{email,password}` → `{token, expiresAt, patient}`                                                        |
| `POST`   | `/api/auth/logout`                | public          | `204`; JWTs are stateless                                                                                 |
| `GET`    | `/api/auth/me`                    | bearer          | current `Patient`                                                                                         |
| `GET`    | `/api/specialties`                | public          | 12 seeded specialties                                                                                     |
| `GET`    | `/api/providers`                  | public          | `q`, repeated `specialty`, `availability`, `consultationType`, `page`, `pageSize` → `Paginated<Provider>` |
| `GET`    | `/api/providers/:id`              | public          | `Provider`, or `404`                                                                                      |
| `GET`    | `/api/providers/:id/slots`        | public          | `from`, `to` required; `AvailabilitySlot[]`                                                               |
| `POST`   | `/api/appointments`               | bearer          | `{providerId,slotId,consultationType,reason}` → `201`; `409 SLOT_TAKEN`                                   |
| `GET`    | `/api/appointments`               | bearer          | optional `?status=`; own appointments only                                                                |
| `GET`    | `/api/appointments/:id`           | bearer          | `403` if not yours                                                                                        |
| `PATCH`  | `/api/appointments/:id`           | bearer          | `{status:"cancelled",cancelReason?}`; frees the slot                                                      |
| `GET`    | `/api/documents`                  | bearer          | own documents, newest first                                                                               |
| `POST`   | `/api/documents`                  | bearer          | multipart `file` + optional `appointmentId`; 10 MB cap                                                    |
| `DELETE` | `/api/documents/:id`              | bearer          | `204`                                                                                                     |
| `GET`    | `/api/conversations`              | bearer          | own conversations                                                                                         |
| `GET`    | `/api/conversations/:id/messages` | bearer          | optional `?after=`                                                                                        |
| `POST`   | `/api/conversations/:id/messages` | bearer          | `{body}` → `201`; provider reply in ~1.5 s                                                                |
| `POST`   | `/api/seed`                       | `x-seed-secret` | idempotent wipe + recreate                                                                                |
| `GET`    | `/health`                         | public          | `{status:"ok"}`                                                                                           |

Errors always use the frontend's shape:

```json
{
  "code": "VALIDATION",
  "message": "Request body failed schema validation.",
  "fieldErrors": { "reason": ["A reason is required."] }
}
```

## Local setup

Requires Node 20+ and PostgreSQL (16 is what this was developed against).

```bash
cd server
cp .env.example .env
# edit DATABASE_URL, JWT_SECRET and SEED_SECRET
npm install
npx prisma migrate deploy     # applies prisma/migrations/0001_init
npm run seed                  # prints the record counts and demo password
npm run dev                   # http://localhost:3001
```

Create the local database and role if you do not have them:

```bash
sudo -u postgres psql -c "CREATE ROLE telemedicine_app LOGIN PASSWORD 'choose-a-password';"
sudo -u postgres psql -c "CREATE DATABASE telemedicine_portal_dev OWNER telemedicine_app;"
```

Then set:

```text
DATABASE_URL=postgresql://telemedicine_app:choose-a-password@127.0.0.1:5432/telemedicine_portal_dev?schema=public
```

Useful commands:

```bash
npm run typecheck     # tsc --noEmit, includes prisma/ and scripts/
npm run build         # emits dist/index.js
npm start             # node dist/index.js
npm run seed          # wipe + recreate the demo data
npm run smoke         # 44 end-to-end checks; server must be running
npx prisma studio     # browse the data
```

## Environment variables, line by line

| Variable        | Required        | Meaning                                                                                                                                                                                                                                                                                          |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`  | yes             | PostgreSQL connection string. Locally, the dev database. On Render, copy the **Internal Database URL** so traffic stays inside the region.                                                                                                                                                       |
| `JWT_SECRET`    | yes             | HS256 signing key for 7-day session tokens. 32+ characters. `openssl rand -hex 32`. Changing it invalidates every existing session.                                                                                                                                                              |
| `CORS_ORIGIN`   | no              | Comma-separated browser origins that receive CORS headers, e.g. `http://localhost:5173,https://demo.example.com`. Unknown origins get no headers rather than a 403, so a same-origin rewrite still works. Only needed when the browser calls the API on a different origin. `*` allows everyone. |
| `PORT`          | no              | Express listen port. Defaults to `3001`. Render injects its own value; do not set it there.                                                                                                                                                                                                      |
| `SEED_SECRET`   | yes for seeding | Exact value required in the `x-seed-secret` header on `POST /api/seed`. `openssl rand -hex 32`.                                                                                                                                                                                                  |
| `DEMO_PASSWORD` | no              | Password assigned to all three seeded patients. Defaults to `demo-password-2026`. Read at seed time, so changing it requires a re-seed.                                                                                                                                                          |
| `NODE_ENV`      | no              | `production` on Render. Suppresses verbose Prisma logs.                                                                                                                                                                                                                                          |

`.env` is gitignored. `.env.example` contains placeholders only.

## Database design notes

- **Models:** `Patient`, `Provider`, `Specialty`, `ProviderSpecialty`,
  `AvailabilitySlot`, `Appointment`, `Document`, `Conversation`, `ChatMessage`.
  There is no `User` table because the only authenticated identity is a patient;
  adding a generic user table with one role would be indirection with no payoff.
- **Enums are uppercase in Postgres, lowercase on the wire.** `serialize.ts` is
  the only place that converts, so the frontend's string unions are preserved.
- **`nextAvailableAt` is computed per request**, not stored. It is the earliest
  `AVAILABLE` slot whose start is in the future, so booking and cancelling
  cannot leave a stale value behind.
- **`Document.data` is `bytea`.** Uploads survive a Render restart or redeploy.
  Seeded documents have metadata but no bytes, because the demo never downloads
  them and inventing file contents would be dishonest.
- **The provider filter is ported from the mock**, including the rolling
  availability windows (`now` = 2 h, `today` = 24 h, `week` = 7 d), OR
  semantics for repeated specialties, and the default page size of 12.
- **Slot claiming is a conditional `updateMany` inside a transaction.** Two
  concurrent bookings cannot both succeed; the loser gets `409 SLOT_TAKEN`.
- **CORS is a browser read allowlist, not an authorization gate.** Unknown
  origins receive no `Access-Control-Allow-Origin` header; the request still
  runs. This matters because a Netlify/Vercel rewrite forwards the browser's
  `Origin` header while the browser itself treats the call as same-origin.
  Rejecting an unknown origin with a 403 would break the proxy for no security
  gain: with Bearer tokens and no cookies, CORS cannot stop a state-changing
  request anyway.
- **The seed is a line-for-line port of `src/mocks/db.ts`**, including the
  `mulberry32` PRNG and `SEED = 20260216`. That is why the same 40 providers,
  ratings, 632 slots and 8 appointments appear in Postgres as in the mock. It
  regenerates relative to the day it runs, so re-seed on demo morning.

## Deploy to Render (exact steps)

1. Push the repository to GitHub. The `server/` directory must be committed
   (its `.env` is not).
2. Render dashboard → **New → PostgreSQL**. Name it
   `telemedicine-portal-db`, choose the same region you will use for the web
   service, and the Free plan.
3. Open the database → copy the **Internal Database URL**.
4. Render dashboard → **New → Web Service** → connect the repository.
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm ci && npx prisma migrate deploy && npm run build`
   - **Start Command:** `node dist/index.js`
   - **Instance Type:** Free
5. Add environment variables under **Environment**:
   - `DATABASE_URL` = the Internal Database URL from step 3
   - `JWT_SECRET` = output of `openssl rand -hex 32`
   - `SEED_SECRET` = output of `openssl rand -hex 32`
   - `DEMO_PASSWORD` = `demo-password-2026` (or your chosen demo password)
   - `CORS_ORIGIN` = your frontend origin, if you are not using the rewrite
   - `NODE_ENV` = `production`
   - If the build picks an old Node, add `NODE_VERSION` = `22`.
6. Deploy. Wait for the log line `API listening on port …` and for
   `GET /health` to return `{"status":"ok"}`.
7. Seed once (and again on demo morning):

   ```bash
   curl -X POST https://YOUR-APP.onrender.com/api/seed \
     -H "x-seed-secret: YOUR_SEED_SECRET"
   ```

   Expected response:

   ```json
   {
     "status": "seeded",
     "specialties": 12,
     "providers": 40,
     "slots": 632,
     "patients": 3,
     "appointments": 8,
     "documents": 6,
     "conversations": 3,
     "messages": 30
   }
   ```

8. Verify login:

   ```bash
   curl -X POST https://YOUR-APP.onrender.com/api/auth/login \
     -H 'content-type: application/json' \
     -d '{"email":"nadia.okafor@example.com","password":"demo-password-2026"}'
   ```

9. Put the bare host into the frontend rewrite:

   - `netlify.toml`: replace `REPLACE_WITH_RENDER_URL` with
     `YOUR-APP.onrender.com`.
   - `vercel.json`: same replacement.
   - Set `VITE_DISABLE_MOCKS=true` in the backend-wired site's build
     environment.
   - Keep a second site/build **without** that variable as the mock-only
     fallback.

10. Verify the rewrite from the deployed frontend:

    ```bash
    curl https://YOUR-FRONTEND/api/health
    ```

    It must return `{"status":"ok"}` from Render, not the SPA's `index.html`.

## Frontend wiring

The frontend already speaks this API. No component or service rewrite is
needed; only configuration:

| Where                          | Change                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Build env (Netlify/Vercel)     | `VITE_DISABLE_MOCKS=true` — without it MSW intercepts every `/api` call and the backend is never contacted |
| `netlify.toml` / `vercel.json` | `/api/*` rewrite to the Render host (same origin from the browser, so no CORS)                             |
| Local dev                      | `VITE_DISABLE_MOCKS=true VITE_API_PROXY_TARGET=http://localhost:3001 npm run dev`                          |

The Vite proxy is in `vite.config.ts`. With MSW on it is unused; with MSW off
it forwards `/api/*` to Express.

**Verify in DevTools before the demo:** open Network, sign in, and confirm the
request is `POST /api/auth/login` served by the Render host — not a `sw.js`
Service Worker interception. If MSW answers, `VITE_DISABLE_MOCKS` was not set
at build time.

## Smoke test

With the server running:

```bash
SEED_SECRET=YOUR_SEED_SECRET npm run smoke
```

Against Render:

```bash
SMOKE_BASE_URL=https://YOUR-APP.onrender.com \
SEED_SECRET=YOUR_SEED_SECRET \
npm run smoke
```

It runs 44 checks: health, auth (including a wrong password), specialties,
provider filtering, slot windows, booking, double-booking, cross-patient 403s,
cancellation and slot release, document upload/delete/MIME rejection, chat,
the provider auto-reply, the shared error shape, and seed gating. If
`SEED_SECRET` is set it re-seeds before and after the run.

## 5-minute live demo script

Prep, 2 minutes before:

```bash
curl https://YOUR-APP.onrender.com/health   # warm the free-tier instance
```

Have two tabs open:

- **Tab A:** the backend-wired frontend (`VITE_DISABLE_MOCKS=true` build).
- **Tab B:** the mock-only fallback build.
- DevTools → Network open in Tab A, filter `auth/login`.

1. **0:00 — Set the frame.** "Same UI you have seen. The difference is that
   every request now goes to an Express API and a PostgreSQL database." Point
   at the Network tab.
2. **0:15 — Sign in as Nadia.**
   `nadia.okafor@example.com` / `demo-password-2026`.
   Network shows `POST /api/auth/login` → `200` with a JWT. "The server minted
   this token; the browser did not."
3. **0:45 — Provider directory.** Open **Find a doctor**, choose **Cardiology**,
   then search `Amara`. "Forty providers and their slots are rows in Postgres."
4. **1:15 — Book.** Open **Dr. Amara Okafor**, click **Book appointment**,
   choose a slot, **Video call**, reason "Persistent headaches for two weeks",
   **Confirm booking**. Land on the appointment detail.
5. **2:00 — Prove persistence.** Refresh the page. The appointment is still
   there. "This is not in memory; it is a row."
6. **2:30 — Cancel and release.** **Appointments → Upcoming**, open the new
   appointment, **Cancel appointment**, confirm. It moves to **Past**.
7. **3:00 — Upload.** **Documents → Choose files**, pick a small PDF, show the
   **Uploaded** badge. Refresh; it is still listed. "The bytes are in a
   PostgreSQL `bytea` column."
8. **3:45 — Chat.** **Messages**, open the first conversation, send
   "Following up on my blood pressure log". Wait ~4 seconds (the client polls
   every 3 s; the reply is written after 1.5 s). The provider reply appears.
   Refresh; both messages remain.
9. **4:30 — Authorization is server-side.** Sign out, sign in as
   `tomas.silva@example.com` / the same password. His **Appointments** and
   **Documents** are empty. In Network, `GET /api/appointments` returns `[]`
   for him. "Ownership is a 403 on the server, not a hidden button."
10. **5:00 — Close.** "The frontend is unchanged. `VITE_DISABLE_MOCKS=true`
    turned off the mock service worker, and the `/api` rewrite points at
    Render."

**If a network call fails:** do not debug Render live. Say "Let me show the
mock-only build" and switch to Tab B, which has the same UI and the same
seeded data. If asked for proof of the database, open the Render Postgres
dashboard and run:

```sql
SELECT id, "patientId", "scheduledAt", status
FROM "Appointment"
ORDER BY "createdAt" DESC
LIMIT 5;
```

## What could break live

| Risk                                                        | Mitigation                                                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Render free-tier cold start (30–60 s)                       | `curl /health` 2 minutes before; keep Tab A warm; fallback Tab B                                 |
| Free Postgres suspended, deleted or out of storage          | check the Render dashboard the night before; re-create and re-seed if needed                     |
| `VITE_DISABLE_MOCKS` not set on the backend build           | DevTools → Network: login must hit `/api/auth/login`, not `sw.js`; set the env var and redeploy  |
| An old MSW service worker still controls the tab            | DevTools → Application → Service Workers → Unregister; hard reload; or use Tab B                 |
| Netlify/Vercel rewrite still has `REPLACE_WITH_RENDER_URL`  | `curl https://YOUR-FRONTEND/api/health` must return `{"status":"ok"}`                            |
| Deploy log shows `P1001` / cannot reach database            | use the **Internal** Database URL, and keep the DB and web service in the same region            |
| Migration not applied on a fresh DB                         | the build command runs `npx prisma migrate deploy`; inspect the deploy log                       |
| Seed not run, or slots are stale                            | `POST /api/seed` on demo morning; it takes seconds and is idempotent                             |
| Chat reply does not appear                                  | wait 3–4 s; the list polls every 3 s; refresh if needed                                          |
| Upload rejected live                                        | use a PDF/PNG/JPEG under 10 MB; the limit is server-side                                         |
| Login fails                                                 | use one of the three demo emails and `DEMO_PASSWORD`; the hint is on the login page              |
| Demo runs past token expiry                                 | tokens last 7 days; this is not the 60-minute mock token                                         |
| Cross-origin call blocked by the browser (absolute API URL) | add the frontend origin to `CORS_ORIGIN` (comma-separated); a same-origin rewrite needs no entry |
| Port mismatch locally                                       | set `PORT` on the server and `VITE_API_PROXY_TARGET` on the frontend                             |
| `prisma generate` missing after a clean install             | `postinstall` runs it; otherwise `npm run prisma:generate`                                       |

## Scope and honest limitations

- **Patient-only.** No doctor login, signup, prescriptions, payments or video.
  The UI has none of these. Adding dead endpoints would be worse than saying so.
- **Prescriptions are scoped for v2.** There is no UI, model or endpoint for
  them. An unused CRUD surface would look like a copied spec, not a delivered
  feature.
- **No token revocation.** Logout deletes the client-side token; a stateless
  7-day JWT remains technically valid until expiry. A production system would
  add a revocation list or short-lived refresh tokens.
- **MIME type is client-supplied.** The upload route trusts `file.mimetype`, as
  the mock did. A production system would sniff magic bytes and scan content.
- **No rate limiting.** Add it at the proxy or with a middleware before any
  public deployment with real users.
- **Not a clinical system.** Synthetic data, sandbox-only. This is not HIPAA
  compliant and must not be presented as ready for real patient data.
- **`/api/seed` is powerful.** It wipes the database. It is gated by
  `SEED_SECRET`; keep that secret out of the frontend and out of git.

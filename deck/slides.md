---
theme: default
title: Telemedicine Portal
highlighter: shiki
transition: slide-left
duration: 5min
timer: countdown
layout: center
class: text-center
fonts:
  sans: Inter
  mono: JetBrains Mono
---

# Telemedicine & Virtual Care Portal

### A patient-first booking experience, built end to end

<div class="mt-10 text-lg opacity-70">
Ademola David-Mark<br />
Student ID: ALT/SOE/TIN/025/0262
</div>

<div class="mt-6 text-sm opacity-50">5-minute project walkthrough</div>

<!--
0:00–0:15 · Opening (15s)

Hi, I'm Ademola. I built a telemedicine portal where a patient can find a
doctor, book a virtual visit, share medical records, and chat with the
provider — one complete journey, with no backend.
-->

---

# From search to care in one flow

<div class="grid grid-cols-4 gap-4 mt-10 text-left">
  <div class="border rounded-lg p-5">
    <div class="text-3xl font-bold opacity-30">01</div>
    <div class="text-xl font-semibold mt-2">Find</div>
    <p class="text-sm opacity-70 mt-2">Search by specialty, availability and visit type.</p>
  </div>
  <div class="border rounded-lg p-5">
    <div class="text-3xl font-bold opacity-30">02</div>
    <div class="text-xl font-semibold mt-2">Book</div>
    <p class="text-sm opacity-70 mt-2">A five-step wizard with review and confirmation.</p>
  </div>
  <div class="border rounded-lg p-5">
    <div class="text-3xl font-bold opacity-30">03</div>
    <div class="text-xl font-semibold mt-2">Share</div>
    <p class="text-sm opacity-70 mt-2">Attach records to a visit, with live progress and retry.</p>
  </div>
  <div class="border rounded-lg p-5">
    <div class="text-3xl font-bold opacity-30">04</div>
    <div class="text-xl font-semibold mt-2">Talk</div>
    <p class="text-sm opacity-70 mt-2">Chat with optimistic sends and polling.</p>
  </div>
</div>

<div class="mt-10 text-center text-sm opacity-60">
  Every endpoint is mocked with MSW — the demo is fully interactive.
</div>

<!--
0:15–1:00 · The product (45s)

Walk the four steps left to right. This is the whole product, not a slice:
- Find: search by specialty, availability and consultation type. Filters live
  in the URL, so the view is shareable and the back button works.
- Book: a five-step wizard with per-step validation and a final review.
- Share: attach a PDF or image to the visit, with real upload progress and retry.
- Talk: a polling chat with optimistic sends, so the UI never waits.

The mock API makes it a complete demo, not a prototype.
-->

---

# The Build Stack

<div class="grid grid-cols-2 gap-4 mt-8 text-left text-lg">
  <div class="border rounded-lg p-4"><strong>React 19</strong> + TypeScript strict</div>
  <div class="border rounded-lg p-4"><strong>TanStack Query</strong> — server state</div>
  <div class="border rounded-lg p-4"><strong>Tailwind v4</strong> + shadcn/Base UI</div>
  <div class="border rounded-lg p-4"><strong>MSW v2</strong> — mock API</div>
  <div class="border rounded-lg p-4"><strong>Vitest</strong> — unit + integration</div>
  <div class="border rounded-lg p-4"><strong>Playwright</strong> — E2E</div>
</div>

<div class="mt-8 text-center text-sm opacity-60">
  React Router 7 · Zod · React Hook Form · Vite
</div>

<!--
1:00–1:30 · Stack (30s)

Keep this fast. The stack was chosen for one reason: each tool owns a clear
job. React 19 and strict TypeScript for the UI, TanStack Query for server
state, Tailwind v4 and shadcn on Base UI for the design system, MSW for a
realistic API, and Vitest plus Playwright for the quality gates.
-->

---

# The UI in action

<div class="grid grid-cols-2 gap-5 mt-6">
  <div class="border rounded-lg p-2">
    <img src="/search.png" alt="Provider search with filters and pagination" class="w-full h-auto rounded" />
    <p class="text-center text-sm mt-2 opacity-70">Provider search · URL-backed filters</p>
  </div>
  <div class="border rounded-lg p-2">
    <img src="/wizard.png" alt="Five-step scheduling wizard" class="w-full h-auto rounded" />
    <p class="text-center text-sm mt-2 opacity-70">Scheduling wizard · five steps</p>
  </div>
</div>

<!--
1:30–2:10 · UI (40s)

Show the two screens rather than reading them.
- Left: the provider directory. Point out the specialty, availability and
  consultation filters, the URL-backed state, and the pagination.
- Right: the scheduling wizard. Point out the five numbered steps and that
  earlier answers survive going back.

This is the part the audience can see and believe.
-->

---

# State: one owner per fact

<div class="grid grid-cols-3 gap-4 mt-8 text-left">
  <div class="border rounded-lg p-5">
    <div class="text-sm uppercase tracking-wide opacity-50">Server</div>
    <div class="text-xl font-semibold mt-1">TanStack Query</div>
    <p class="text-sm opacity-70 mt-2">Providers, appointments, documents, chat.</p>
  </div>
  <div class="border rounded-lg p-5">
    <div class="text-sm uppercase tracking-wide opacity-50">Workflow</div>
    <div class="text-xl font-semibold mt-1">Context + Reducer</div>
    <p class="text-sm opacity-70 mt-2">Wizard draft, upload queue, auth, theme.</p>
  </div>
  <div class="border rounded-lg p-5">
    <div class="text-sm uppercase tracking-wide opacity-50">Navigation</div>
    <div class="text-xl font-semibold mt-1">URL params</div>
    <p class="text-sm opacity-70 mt-2">Filters, tabs and page — shareable and reload-safe.</p>
  </div>
</div>

<div class="mt-10 text-center text-2xl font-semibold">
  Never store the same data in two places.
</div>

<!--
2:10–3:00 · State strategy (50s)

The rule is on the slide: never store the same data in two places.
- Server state goes to TanStack Query: providers, appointments, documents,
  conversations. Query owns caching, invalidation and retries.
- Workflow state goes to Context + Reducer: the wizard draft, the upload queue,
  auth and theme. These are client transitions, not server records.
- Filters, tabs and pages live in the URL, so they are shareable and survive a
  reload or a back button.

The upload queue is the clearest example: Query has no concept of transfer
progress, so progress belongs in a reducer.
-->

---

# The hard parts

<div class="grid grid-cols-3 gap-4 mt-8 text-left">
  <div class="border rounded-lg p-5">
    <div class="text-lg font-semibold">Real upload progress</div>
    <p class="text-sm opacity-70 mt-2">
      XHR, because <code>fetch</code> cannot report progress. The queue lives in a reducer.
    </p>
  </div>
  <div class="border rounded-lg p-5">
    <div class="text-lg font-semibold">Optimistic chat</div>
    <p class="text-sm opacity-70 mt-2">
      Merge incoming messages by id — polling never wipes a message the user just sent.
    </p>
  </div>
  <div class="border rounded-lg p-5">
    <div class="text-lg font-semibold">Protect the draft</div>
    <p class="text-sm opacity-70 mt-2">
      <code>useBlocker</code> and <code>beforeunload</code> guard an unfinished booking.
    </p>
  </div>
</div>

<!--
3:00–4:00 · Hard problems (60s)

Tell these as three mini-stories. This is the most technical part.
1. Upload progress: fetch cannot report upload progress, so the transport is
   XHR wrapped in a Promise. Progress ticks live in a reducer, not Query.
2. Chat: the send is optimistic. Polling returns an array, so we merge by
   message id instead of replacing it — otherwise the user's message vanishes
   for three seconds.
3. Wizard: useBlocker plus beforeunload protects an unfinished booking. The
   user gets a confirm dialog instead of losing five steps.
-->

---

# Quality is a feature

<div class="grid grid-cols-2 gap-4 mt-8 text-left">
  <div class="border rounded-lg p-6">
    <div class="text-5xl font-bold">118</div>
    <p class="text-sm opacity-70 mt-1">unit + integration tests</p>
  </div>
  <div class="border rounded-lg p-6">
    <div class="text-5xl font-bold">100%</div>
    <p class="text-sm opacity-70 mt-1">coverage on reducers and schemas</p>
  </div>
  <div class="border rounded-lg p-6">
    <div class="text-5xl font-bold">8</div>
    <p class="text-sm opacity-70 mt-1">Playwright end-to-end flows</p>
  </div>
  <div class="border rounded-lg p-6">
    <div class="text-5xl font-bold">0</div>
    <p class="text-sm opacity-70 mt-1">axe WCAG violations, light and dark</p>
  </div>
</div>

<div class="mt-8 text-center text-sm opacity-60">
  ~83.0% statement coverage · strict TypeScript · lint, format and build in CI
</div>

<!--
4:00–4:45 · Quality (45s)

These are measured, not claimed:
- 118 unit and integration tests.
- 100% coverage on reducers and validation schemas.
- 8 Playwright flows: auth redirects, uploads and retry, appointment sharing,
  optimistic chat.
- 0 WCAG violations from an axe-core audit across desktop, mobile, light and dark.
Overall statement coverage is about 83%, with per-directory thresholds in CI.
-->

---
layout: center
class: text-center
---

# Built end to end.

### Mocked by design. Ready to demo.

<div class="mt-10 text-2xl font-semibold">Questions?</div>

<div class="mt-6 text-sm opacity-50">
github.com/4MHARK/Telemedicine-Portall
</div>

<!--
4:45–5:00 · Close (15s)

That is the portal: a complete patient journey, a clear state model, and the
hard edge cases handled. The code and deck are in the repo. Thank you —
questions?
-->

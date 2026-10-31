---
theme: default
title: Telemedicine Portal
highlighter: shiki
transition: slide-left
fonts:
  sans: Inter
  mono: JetBrains Mono
---

<!-- Slide 1 -->
# Telemedicine & Virtual Care Patient Portal

Ademola David-Mark\
Student ID: ALT/SOE/TIN/025/0262

---

<!-- Slide 2 -->
# The Patient Journey

<div class="text-2xl mt-12 space-y-6">
  <div><strong>1.</strong> Search for a provider by specialty & availability</div>
  <div><strong>2.</strong> Schedule an appointment via a 5-step wizard</div>
  <div><strong>3.</strong> Upload secure medical documents</div>
  <div><strong>4.</strong> Chat with the provider</div>
</div>

---

<!-- Slide 3 -->
# The Stack

- React 19 + TypeScript strict
- TanStack Query (Server state)
- Tailwind v4 + shadcn/ui
- MSW v2 (Mock API)
- Vitest + Playwright

---

<!-- Slide 4 -->
# The UI in Action

<div class="grid grid-cols-2 gap-4 mt-8">
  <div class="border rounded p-2">
    <img src="/search.png" alt="Search" class="w-full h-auto" />
    <p class="text-center text-sm mt-2">Provider Search</p>
  </div>
  <div class="border rounded p-2">
    <img src="/wizard.png" alt="Wizard" class="w-full h-auto" />
    <p class="text-center text-sm mt-2">Scheduling Wizard</p>
  </div>
</div>

---

<!-- Slide 5 -->
# Architecture & State Strategy

**Server State:** TanStack Query
* Providers, appointments, documents

**Client State:** Context + Reducer
* Scheduling wizard, upload queue

**Rule:** Never store the same data in two places.

---

<!-- Slide 6 -->
# Handling Edge Cases

- **Real-time progress:** Custom XHR wrapper for document uploads.
- **Optimistic UI:** Chat messages merge by ID so polling never wipes a user's text.
- **Route Guards:** `useBlocker` prevents leaving the wizard mid-booking.

---

<!-- Slide 7 -->
# Reliability & Testing

- **100% logic coverage** on reducers & validation
- **E2E Tested** for critical flows (Auth, Uploads, Chat)
- **Responsive** across mobile, tablet, and desktop
- **Accessible** with focus states and ARIA

---
layout: center
---

<!-- Slide 8 -->
# Questions?

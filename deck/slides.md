---
theme: default
title: Telemedicine Portal — Architecture & Build Plan
highlighter: shiki
lineNumbers: true
transition: slide-left
fonts:
  sans: Inter
  mono: JetBrains Mono
drawings:
  persist: false
layout: center
---

# Telemedicine & Virtual Care Patient Portal

[Your Name]\
Student ID: [Your ID]

---
layout: default
---

# What the Project Does

- Provider search
- Multi-step scheduling
- Secure document uploads with progress
- Live chat simulation

---
layout: default
---

# The Stack

- React 19 + TypeScript strict
- TanStack Query
- Tailwind v4 + shadcn/ui
- MSW v2
- Vitest + Playwright

---
layout: default
---

# The Hardest Problem

Document uploads must report real progress.\
fetch() cannot report upload progress.

→ Built the upload queue on XHR.\
→ Kept progress state in a Reducer, not Query.

---
layout: default
---

# Built & Verified

- 3 phases completed
- 11 routes
- 4 features end-to-end
- 100% logic coverage on reducers & schemas
- E2E tested

---
layout: center
---

# Questions?

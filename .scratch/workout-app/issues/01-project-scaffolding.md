# 01 — Project scaffolding

**What to build:** An empty but installable PWA the user can add to their phone's home screen and open offline. Sets up the technical foundation every later ticket builds on: React + TypeScript + Vite, Tailwind CSS + shadcn/ui, `vite-plugin-pwa` (manifest + service worker for offline/installable), Dexie.js wired to an (initially empty) IndexedDB database, and a test runner (e.g. Vitest) with the Store module scaffolded as an empty seam ready for later tickets to fill in.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `npm run dev` serves a working React app locally
- [ ] The app is installable to an Android phone's home screen via Chrome (manifest + service worker present)
- [ ] The app loads and renders when the device is offline (after first load)
- [ ] Tailwind CSS and at least one shadcn/ui component render correctly on a page
- [ ] Dexie.js is configured against an IndexedDB database with no tables yet defined for domain entities
- [ ] A `Store` module exists as the designated seam between UI and persistence, currently empty/stubbed
- [ ] A test runner is configured and a trivial passing test demonstrates the Store module is testable in isolation (no DOM/browser APIs required)

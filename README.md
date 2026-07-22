# LiftLog

A minimal, single-user mobile PWA for building Workouts and logging how you actually perform them over time — no accounts, no backend, no subscriptions. Everything runs on-device and works fully offline.

## What it does

- Build reusable **Workouts** from a shared **Exercise** list (a seeded ~100 common lifts, plus your own).
- Start a **Session** against a Workout and log **Sets** (weight × reps) per Exercise — fields pre-fill from your last time doing that Workout.
- Browse, edit, or delete past Sessions in **History**.
- **Export/Import** your full dataset as a single JSON file, to back it up or move it to a new phone.

See [`CONTEXT.md`](./CONTEXT.md) for the domain vocabulary (Workout / Session / Exercise / Set) and [`docs/adr/`](./docs/adr/) for the reasoning behind key decisions, like why a Session snapshots its Workout instead of referencing it live.

## Stack

React + TypeScript + Vite, styled with Tailwind CSS + shadcn/ui. Data lives in IndexedDB via Dexie, behind a Dexie-independent `Store` module (`src/store/`) that the UI is built and tested against. `vite-plugin-pwa` handles installability and offline support. No server, no auth.

## Getting started

```bash
npm install
npm run dev       # dev server with HMR
npm test          # run the Store's test suite (in-memory fake persistence, no DOM)
npm run lint       # oxlint
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build locally
```

To try it on a phone during development, run `npm run dev -- --host` and open `http://<your-computer's-LAN-IP>:5173` from the phone's browser (same Wi-Fi network).

## Deploying

The production build (`npm run build`) is fully static — deploy `dist/` anywhere that serves static files (Vercel, Netlify, GitHub Pages, Cloudflare Pages, ...). Once deployed, open the URL on your phone and use "Add to Home Screen" — after that first load it's installed and works offline, since the service worker caches the app and all data stays in IndexedDB on-device.

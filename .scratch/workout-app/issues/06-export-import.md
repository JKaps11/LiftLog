# 06 — Export / Import

**What to build:** A way for the user to back up and transfer their data. Export serializes the full local dataset (Exercises, Workouts, Sessions) to a single JSON file the user can save or share off the device; import reads that JSON file back in and repopulates IndexedDB, so the user can move their history to a new phone.

**Blocked by:** 04 — needs the full data schema (Exercise, Workout, Session) to be stable before serializing it.

**Status:** ready-for-agent

- [ ] The user can trigger an export that produces a single JSON file containing all Exercises, Workouts, and Sessions
- [ ] The user can save or share that exported file off the device (exact mechanism — Web Share API vs. plain download — is an implementation detail for this ticket to resolve)
- [ ] The user can trigger an import, select a previously exported JSON file, and have their Exercises, Workouts, and Sessions restored
- [ ] Store operations `exportData` and `importData` exist and are covered by a round-trip test: export then import reproduces identical data (in-memory fake persistence, no DOM/browser APIs)

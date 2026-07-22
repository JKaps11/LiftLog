# 06 — Export / Import

**What to build:** A way for the user to back up and transfer their data. Export serializes the full local dataset (Exercises, Workouts, Sessions) to a single JSON file the user can save or share off the device; import reads that JSON file back in and repopulates IndexedDB, so the user can move their history to a new phone.

**Blocked by:** 04 — needs the full data schema (Exercise, Workout, Session) to be stable before serializing it.

**Status:** done

- [x] The user can trigger an export that produces a single JSON file containing all Exercises, Workouts, and Sessions
- [x] The user can save or share that exported file off the device (exact mechanism — Web Share API vs. plain download — is an implementation detail for this ticket to resolve)
- [x] The user can trigger an import, select a previously exported JSON file, and have their Exercises, Workouts, and Sessions restored
- [x] Store operations `exportData` and `importData` exist and are covered by a round-trip test: export then import reproduces identical data (in-memory fake persistence, no DOM/browser APIs)

## Comments

Implemented: Store gained `exportData` (returns `{ version: 1, exercises, workouts, sessions }`)
and `importData` (clears each table, then repopulates from the given export — a full
restore, not a merge, since merge semantics for conflicting/duplicate IDs across devices
isn't something the ticket or spec asked for). `EntityTable` gained a `clear()` method
(Dexie's `Table` already has one natively; the in-memory test fake got one too). Covered
by round-trip tests in `store.test.ts`, plus a test that import replaces rather than merges.

UI: a new "Data" tab (`DataPage`) with an Export button (serializes via `Blob` + a
programmatic download link — chosen over the Web Share API for broader browser support and
simplicity, per the ticket's note that this is an implementation detail) and an Import
button (hidden file input → parse JSON → validate shape → confirm the destructive replace
→ `importData` → reload so every tab picks up the restored data).

Code review flagged that the import validation only checked top-level array-ness, not that
each array element actually looked like an `Exercise`/`Workout`/`Session` — since import is
the app's one boundary for externally-authored (untrusted) JSON, unlike every other
Store-mutating path which originates from typed in-app forms. Fixed: `isExportedData` now
validates every element's shape, verified with a smoke test that a structurally-plausible
but malformed file (wrong field types) is rejected with a message rather than being
imported.

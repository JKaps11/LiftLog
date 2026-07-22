# 02 — Exercise management

**What to build:** A screen for managing the shared Exercise list. On first launch, the app seeds itself with a bundled JSON list of ~100 common exercises (across major muscle groups/equipment types) into IndexedDB, only if the Exercise table is currently empty. The user can view all Exercises, add a new one by typing just its name, rename an existing one, and delete one. This is the first real vertical slice through the Store seam scaffolded in ticket 01.

**Blocked by:** 01 — needs the project scaffolding and Store seam in place.

**Status:** ready-for-agent

- [ ] On first launch (empty Exercise table), the app seeds ~100 common exercises automatically; on subsequent launches it does not re-seed or duplicate them
- [ ] The user can view a list of all Exercises
- [ ] The user can add a custom Exercise by entering a name (no other fields)
- [ ] The user can rename an existing Exercise
- [ ] The user can delete an Exercise
- [ ] Store operations `createExercise`, `renameExercise`, `deleteExercise` exist and are covered by tests using an in-memory fake in place of Dexie/IndexedDB (no DOM/browser APIs in these tests)

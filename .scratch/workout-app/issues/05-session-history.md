# 05 — Session history

**What to build:** A screen where the user can browse their logged Session history: a list of past Sessions, a detail view for a single Session (all its Exercises, Sets, weights, reps, notes, start/end times), and the ability to edit or delete a past Session (e.g. to correct a logging mistake).

**Blocked by:** 04 — needs Sessions to exist to view.

**Status:** ready-for-agent

- [ ] The user can view a list of their past Sessions
- [ ] The user can open a single Session and see its full detail: exercises, sets (weight/reps), notes, start time, end time, date
- [ ] The user can edit a past Session's logged data (sets, notes, times)
- [ ] The user can delete a past Session
- [ ] Store operations `listSessionsForWorkout` (or equivalent listing operation) and `deleteSession` exist and are covered by tests (in-memory fake persistence, no DOM/browser APIs)

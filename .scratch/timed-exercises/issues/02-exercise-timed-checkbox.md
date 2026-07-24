# 02 — Exercise create/edit UI: Timed checkbox

**What to build:** Let the user mark an Exercise as timed from the Exercises screen, both when creating a new one and when editing an existing one — so they can retag their current exercise list (e.g. Plank, Wall Sit) without recreating them.

**Blocked by:** 01 — needs `createExercise`'s `isTimed` param and the Exercise-update path in place

**Status:** ready-for-agent

- [ ] The "add Exercise" form has a "Timed" checkbox alongside the name field and the existing "Unilateral" checkbox; checking it and submitting creates the Exercise with `isTimed: true`
- [ ] The existing Exercise edit/rename flow also shows the "Timed" checkbox, pre-filled with the Exercise's current value, and saving persists a changed value
- [ ] Unchecking a previously-timed Exercise persists `isTimed: false`
- [ ] "Timed" and "Unilateral" can both be checked on the same Exercise
- [ ] Manually verified in the running app (no component test suite exists in this repo yet, per the spec's testing decisions)

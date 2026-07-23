# 02 — Exercise create/edit UI: Unilateral checkbox

**What to build:** Let the user mark an Exercise as unilateral from the Exercises screen, both when creating a new one and when editing an existing one — so they can retag their current exercise list (e.g. Single Arm Row, Bulgarian Split Squat) without recreating them.

**Blocked by:** 01 — needs `createExercise`'s `isUnilateral` param and the Exercise-update path in place

**Status:** ready-for-agent

- [ ] The "add Exercise" form has an "Unilateral" checkbox alongside the name field; checking it and submitting creates the Exercise with `isUnilateral: true`
- [ ] The existing Exercise edit/rename flow also shows the "Unilateral" checkbox, pre-filled with the Exercise's current value, and saving persists a changed value
- [ ] Unchecking a previously-unilateral Exercise persists `isUnilateral: false`
- [ ] Manually verified in the running app (no component test suite exists in this repo yet, per the spec's testing decisions)

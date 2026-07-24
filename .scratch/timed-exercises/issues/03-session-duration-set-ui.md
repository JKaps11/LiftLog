# 03 — Session logging/history UI: duration-only Set row

**What to build:** In both active-session logging and past-session history views, render a timed Exercise's Sets as a single duration-in-seconds field instead of weight/reps, combining correctly with the existing unilateral pairing/divider UI.

**Blocked by:** 01, 02 — needs the Store's duration-Set behavior and a way to actually mark an Exercise timed to exercise the flow end-to-end

**Status:** ready-for-agent

- [ ] A Set with `durationSeconds` present renders as a single number input (aria-label referencing "duration") with a "sec" unit label, in place of the weight input + "×" + reps input pair
- [ ] Tapping "Add set" on a timed, non-unilateral Exercise logs one duration Set
- [ ] Tapping "Add set" on a timed **and** unilateral Exercise logs a left duration Set immediately followed by a right duration Set, rendered as two rows with no divider between them (same as the existing weight/reps unilateral behavior)
- [ ] The divider-between-logical-groups behavior is unchanged and applies identically whether a group is weight/reps or duration-only
- [ ] The duration value of a timed Set can be edited after logging
- [ ] Deleting either Set of a timed+unilateral pair removes both from the display in one action
- [ ] "Add set" and delete on a non-timed Exercise behave exactly as they do today
- [ ] Sets logged before an Exercise was marked timed continue to render as weight/reps rows even if the Exercise is now flagged timed
- [ ] Manually verified in the running app (no component test suite exists in this repo yet, per the spec's testing decisions)

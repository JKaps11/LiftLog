# 05 — End Session prunes untouched Sets

**What to build:** Ending a Session drops the Sets you never touched, so history holds only weight and reps you actually lifted. An Exercise you skipped entirely stays listed in the finished Session with no Sets — the record still shows it was part of that day's Workout and that you skipped it. A number you half-entered is kept rather than silently thrown away.

**Blocked by:** 02

**Status:** done

- [ ] Ending a Session removes Sets carrying no measurement fields at all
- [ ] Logged Sets are left completely untouched
- [ ] A partially-entered Set survives ending the Session — this is deliberately a looser rule than the logged-vs-pending predicate, which treats a partial Set as not done
- [ ] An Exercise left with no Logged Sets keeps its entry in the Session with an empty Set list, per the ADR-0001 snapshot of what the Workout contained that day
- [ ] A finished Session in History renders a fully-skipped Exercise cleanly, with no Sets
- [ ] Notes, start time and end time are unaffected

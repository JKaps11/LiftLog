# 04 — Recategorize seed exercises, add Stretch & Mobility seed data

**What to build:** A fresh install seeds a fully-categorized exercise list: every existing strength exercise gets a real Primary Muscle Group and Type, and new Stretch and Mobility exercises are added so the app is useful for that kind of training from the start — no manual categorization or migration required.

**Blocked by:** 01, 02.

- [ ] Every seeded exercise (existing strength movements and new ones) has a real, sensible Primary Muscle Group and Type assigned — none are left uncategorized or defaulted to a placeholder value.
- [ ] New Stretch exercises are added to the seed set, covering the major muscle groups.
- [ ] New Mobility exercises are added to the seed set, covering the major muscle groups.
- [ ] A fresh install (empty local data) shows the fully grouped, categorized list immediately when viewing the Exercises page from ticket 02.
- [ ] No migration or backfill prompt is shown — this only affects the seed path for empty local data, matching the existing `isTimed` seed precedent.

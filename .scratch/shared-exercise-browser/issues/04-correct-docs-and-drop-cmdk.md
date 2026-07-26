# 04 — Correct ADR 0002, record ADR 0003, drop unused `cmdk`

**What to build:** Make the docs and the dependency list describe the code that actually exists.

`docs/adr/0002-exercise-categorization.md` claims the picker UI is built on shadcn's `Command` component and lists "filter chips, category tabs" among the rejected alternatives. Neither is true: both surfaces are plain `Input` + `<ul>`, and the Exercises page later grew exactly the type-filter chips and jump rail the ADR says were rejected. `cmdk` and `src/components/ui/command.tsx` are installed and imported by nothing.

**Blocked by:** 03 (so ADR 0003 records what was actually built).

- [x] ADR 0002's claim that the picker uses shadcn's `Command` is corrected to describe the plain search + grouped-list implementation.
- [x] ADR 0002's rejected-alternatives passage no longer contradicts the type-filter segmented control and jump-to-group rail that now exist.
- [x] ADR 0002's substantive decision — two orthogonal fields rather than a merged enum or freeform tags — is left intact; only the claims about the UI are corrected.
- [x] A new `docs/adr/0003-shared-exercise-browser.md` records: one browsing component parameterized by row renderer, picking as a full-screen step rather than an inline box, why (two hand-maintained copies drifted; sticky and jump-rail positioning need page scroll), and the alternatives rejected (a `mode` prop, a hook-plus-header split, keeping the picker inline).
- [x] `cmdk` is removed from `package.json` and `src/components/ui/command.tsx` is deleted.
- [x] `npm run build` and `npm test` pass after the removal.
- [x] `CONTEXT.md` is unchanged — this work introduces no new domain term.
- [x] `.scratch/exercise-tagging/spec.md` is left as-is, a point-in-time record.

# 07 — Dark-mode minimalist design pass

**What to build:** A cohesive visual design pass across every screen built so far (Exercise management, Workout builder, Session logging, Session history, Export/Import), giving the app a dark-mode, minimalist look and feel rather than the default/unstyled shadcn appearance. Trigger the `frontend-design` skill to drive this — it should be applied consistently across the whole app in one pass, not screen-by-screen ad hoc.

**Blocked by:** 02, 03, 04, 05, 06 — every screen must exist before it can be restyled as one cohesive pass.

**Status:** done

- [x] The `frontend-design` skill is invoked to establish and apply a dark-mode, minimalist visual direction (typography, spacing, color) across the app
- [x] Every existing screen (Exercise management, Workout builder, Session logging, Session history, Export/Import) reflects the same visual system — no screen left in default/unstyled shadcn appearance
- [x] The app defaults to dark mode
- [x] Core flows (create Workout, log a Session, view history) remain fully usable/legible on a phone screen after restyling

## Comments

Invoked `frontend-design` and ran a single planning pass rather than restyling
screen-by-screen. Grounded the direction in the subject (a personal lifting
logger used one-handed, mid-set, at a gym): an iron/steel graphite palette
with one restrained warm-amber accent (`src/index.css`'s `.dark` block,
avoiding the near-black+acid-green/vermilion look called out as an AI-design
default), Bebas Neue for condensed all-caps page headings (gym-signage
character), Geist for body/UI text, and — the signature choice — JetBrains
Mono with tabular figures for every weight/rep/time numeral throughout the
app, since scanning numbers at a glance between sets is the app's actual job.
Two new shared primitives, `PageHeading` and `SectionLabel`
(`src/components/ui/`), carry the heading/label treatment to all five
screens mechanically rather than by per-page discipline. Navigation moved
from a top row of ghost buttons to a fixed bottom tab bar with icons, for
one-handed thumb reach; set-logging inputs were enlarged for easier tapping.
`--radius` was tightened for a more structural, less bubbly feel. The app
defaults to dark mode unconditionally via `class="dark"` on `<html>` (not
gated behind `prefers-color-scheme`, no toggle to fall back through).

Verified all five screens on a 390×844 mobile viewport with no console
errors, including the core flows (build a Workout, start/log/end a Session,
browse History into a Session's detail).

Code review caught two real gaps: the new `PageHeading`/`SectionLabel`
components were missing the `data-slot` attribute every other
`src/components/ui/` primitive carries — fixed. And the scaffold's light-mode
`:root` block was left with its old values and no indication it's now
inert while `html.dark` is force-applied — added a comment flagging it as
dead-while-toggle-less, to update if a light/dark toggle is ever added.

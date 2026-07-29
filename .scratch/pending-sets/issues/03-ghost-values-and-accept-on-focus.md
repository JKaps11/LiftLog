# 03 — Ghost Values and accept-on-focus

**What to build:** A Pending Set shows what you did last time as a **Ghost Value** — greyed hint text inside the empty field, never a stored value — and accepting it costs one tap and no typing. Touching any measurement field of a Pending Set fills that entire row solid from its Ghost Values and saves it, leaving the keyboard open with the value selected so you can type over it if today's number was different.

At this point the only Pending Sets come from "Add set", so this delivers the within-Session fallback: an added Set takes its Ghost Values from the last Set you logged for that Exercise today. Demoable end to end — add a 4th Set, see your 3rd Set's numbers ghosted, tap once, done.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The display module resolves Ghost Values per field alongside solid values, and its test covers pending, logged, and partially-entered rows
- [ ] A Pending row shows its Ghost Values as muted placeholder text and no solid values
- [ ] Focusing any measurement field of a Pending Set writes every measurement for that row from its Ghost Values and persists immediately
- [ ] After accepting, focus proceeds normally with the value selected for immediate overtyping
- [ ] Each side of a unilateral pair accepts independently — a row is one side
- [ ] Focusing a Pending Set that has no Ghost Values fills nothing and leaves the Set pending until a number is typed
- [ ] An added Set's Ghost Values come from the last Logged Set for that Exercise in the current Session; with none, the fields are simply blank
- [ ] Ghost Values are never written to storage until accepted
- [ ] A partially-entered row keeps its Ghost Value on the still-empty field and shows the typed value solid

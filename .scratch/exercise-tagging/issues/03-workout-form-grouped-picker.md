# 03 — Grouped, searchable exercise picker in the Workout builder

**What to build:** The "Add exercises" picker inside the Workout create/edit form gets the same grouped-by-Primary-Muscle-Group, name-only-search browsing as the Exercises page, while keeping its existing multi-select-checkbox behavior (picking exercises doesn't close or navigate away from the picker).

**Blocked by:** 01, 02.

- [ ] The Workout form's "Add exercises" section groups candidate exercises into sections by Primary Muscle Group, matching the same grouping used on the Exercises page.
- [ ] The same name-only search behavior narrows the picker's visible exercises within their sections.
- [ ] Selecting/deselecting an exercise still works via checkbox, without closing the picker or losing the current search/scroll position.
- [ ] The already-selected "Exercises in order" list above the picker, and its reorder/remove controls, are unaffected.
- [ ] An empty search result and an empty muscle-group section are handled the same way as ticket 02.

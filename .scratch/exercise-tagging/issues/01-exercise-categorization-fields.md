# 01 — Categorize exercises: schema, Store, and create/edit form

**What to build:** Every Exercise can be given a Primary Muscle Group, a Type (Strength/Stretch/Mobility), and optionally one or more Other Muscle Groups, both when creating a new Exercise and when editing an existing one. These are independent of the existing Unilateral/Timed flags. When the user sets Type to Stretch or Mobility while creating a new Exercise, the Timed checkbox defaults to checked (still overridable, and not re-applied retroactively if Type is changed later).

**Blocked by:** None — can start immediately.

- [ ] Exercise has a required `primaryMuscleGroup` (one of: Chest, Back, Shoulders, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core, Neck), a required `type` (Strength, Stretch, Mobility), and a required `otherMuscleGroups` (zero or more of the same Muscle Group values, defaulting to none).
- [ ] Creating an Exercise requires choosing a Primary Muscle Group and a Type; Other Muscle Groups is optional.
- [ ] Editing an existing Exercise allows independently changing Primary Muscle Group, Type, and Other Muscle Groups without affecting Unilateral/Timed or any other field.
- [ ] Choosing Type: Stretch or Type: Mobility in the *create* form defaults the Timed checkbox to checked; the user can still uncheck it before saving.
- [ ] Changing an existing Exercise's Type on the *edit* form never automatically changes its current Timed value.
- [ ] Unilateral and Timed continue to work exactly as before, fully independent of the new fields.

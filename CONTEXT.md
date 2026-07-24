# LiftLog

A minimal, single-user mobile PWA for defining workouts and logging performance of them over time.

## Language

**Workout**:
A reusable template/routine defining a set of exercises to be performed (e.g., "Push Day"). Created once, performed many times.
_Avoid_: Routine, plan (use Workout consistently)

**Session**:
A record of one actual performance of a Workout on a specific date, capturing the real weights/reps/sets done. Sessions are what the strength-over-time graph is built from.
_Avoid_: Log, entry, workout (a Session is an instance of performing a Workout, not the Workout itself)

**Exercise**:
A single reusable movement (e.g., "Bench Press", "Squat"), shared across all Workouts. Workouts reference Exercises rather than each defining their own copy, so strength history for an Exercise can be tracked across every Workout it appears in.
_Avoid_: Movement, lift

**Set**:
One completed unit of an Exercise within a Session, recording the weight and reps performed. A Session logs one or more Sets per Exercise.
_Avoid_: Rep (a Rep is a single repetition within a Set, not the Set itself)

**Primary Muscle Group**:
The single required body-part an Exercise is grouped/browsed by, at fine anatomical granularity (Chest, Back, Shoulders, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core, Neck). Every Exercise, including Stretches and Mobility drills, has exactly one.
_Avoid_: Muscle Group, Body part, Category (always say "Primary" to distinguish from Other Muscle Groups)

**Other Muscle Groups**:
An optional set of additional Muscle Groups an Exercise also involves, beyond its Primary Muscle Group (e.g., "World's Greatest Stretch" has Primary: Hips, Other: [Hamstrings, Thoracic Spine]). Used for filtering only, never for primary browsing/grouping.
_Avoid_: Secondary muscles, tags

**Type**:
The training modality of an Exercise — Strength, Stretch, or Mobility — orthogonal to Muscle Group. Two Exercises can share a Muscle Group but differ in Type (e.g., "Bench Press" is Strength/Chest, "Doorway Chest Stretch" is Stretch/Chest).
_Avoid_: Category (ambiguous between Muscle Group and Type — always name the specific axis)

**Stretch**:
A Type value: an Exercise performed as static holding to increase range of motion at rest (e.g., "Hamstring Stretch"). Distinct from Mobility.

**Mobility**:
A Type value: an Exercise performed as active, dynamic movement prep or range-of-motion drill (e.g., "Hip 90/90 Rotation"). Distinct from Stretch.

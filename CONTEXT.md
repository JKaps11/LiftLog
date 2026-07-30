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
One unit of an Exercise within a Session, recording the weight and reps performed. A Session holds one or more Sets per Exercise. Every Set is either Logged or Pending.
_Avoid_: Rep (a Rep is a single repetition within a Set, not the Set itself)

**Logged Set**:
A Set the user actually performed, carrying every measurement its Exercise implies — weight and reps, or a duration for a timed Exercise. A Set is Logged if and only if those measurements are present, so a weight of zero is Logged while an absent weight is not.
_Avoid_: Completed Set, done Set

**Pending Set**:
A Set that exists in a Session but has not been performed, carrying no measurements. Entering a measurement is what turns a Pending Set into a Logged Set — there is no separate act of completing one.
_Avoid_: Incomplete Set, empty Set, unlogged Set, prefilled Set

**Carried-Over Shape**:
The structure of the work a Session opens with, taken from the last Session that Logged the Exercise: how many Sets, and whether each is a solo Set or a left/right pair. Only the shape is carried over — never the measurements, which is what distinguishes a fresh Session from a completed one.
_Avoid_: Prefill, template (a Workout is the template; the Carried-Over Shape comes from history)

**Ghost Value**:
A measurement from the last Session that Logged an Exercise, shown as a hint inside a Pending Set's empty field. A Ghost Value is display-only and never stored; accepting one writes it as a real measurement.
_Avoid_: Placeholder, prefilled value, previous value

**Logical Set**:
One Set as the lifter counts it: a single Set for an ordinary Exercise, or the left+right pair for a unilateral one. A unilateral Logical Set is numbered as one Set even though it records two performances.
_Avoid_: Set pair, set group, superset (a Superset is unrelated — two different Exercises alternated)

**Load**:
What an Exercise is performed at, chosen before the Set is done — weight for an ordinary Exercise, hold duration for a timed one. Distinct from Reps, which is the outcome of having done the Set rather than a setting dialed in beforehand.
_Avoid_: Intensity, resistance, effort (and never count Reps as part of the Load)

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

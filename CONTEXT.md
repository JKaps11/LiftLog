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

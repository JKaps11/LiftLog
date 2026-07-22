# Sessions snapshot their Exercises, independent of later Workout edits

A Session logs performance against a Workout template. When a Workout is later edited (exercises added, removed, or renamed), we decided existing Sessions must NOT change retroactively — each Session stores its own copy of what was logged (which Exercises, which Sets), not a live reference to the current state of the Workout. Editing a Workout only affects Sessions logged after the edit.

Considered making Session reference the Workout live, so edits would apply everywhere — rejected because it would silently rewrite workout history (e.g., removing an exercise from a Workout would erase it from past Sessions), which is surprising and destructive for a strength-history/progress-tracking use case.

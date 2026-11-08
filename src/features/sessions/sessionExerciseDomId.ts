/** The anchor id of an Exercise's card, so a screen can scroll a newly added one into view. */
export function sessionExerciseDomId(exerciseId: string): string {
  return `session-exercise-${exerciseId}`
}

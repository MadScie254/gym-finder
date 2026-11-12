/**
 * The planner writes "Goblet squat · 2 sets of 8–10 comfortable reps".
 * Screens show the move and the dose on separate lines instead of a dotted string.
 */
export function splitExercise(text: string): { move: string; dose: string | null } {
  const [move, ...rest] = text.split(" · ");
  return { move, dose: rest.length ? rest.join(", ") : null };
}

export function exerciseLine(text: string): string {
  const { move, dose } = splitExercise(text);
  return dose ? `${move}: ${dose}` : move;
}

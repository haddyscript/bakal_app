const CATEGORY_ORDER = ['CHEST', 'BACK', 'SHOULDER', 'TRICEP', 'BICEP', 'LEGS', 'CORE', 'OTHER'] as const;

const CATEGORY_PATTERNS: [RegExp, string][] = [
  [/chest/i, 'CHEST'],
  [/back|lat/i, 'BACK'],
  [/shoulder|delt/i, 'SHOULDER'],
  [/tricep/i, 'TRICEP'],
  [/bicep/i, 'BICEP'],
  [/leg|quad|hamstring|calf|glute/i, 'LEGS'],
  [/core|abs?\b|abdominal/i, 'CORE'],
];

// Buckets a free-text muscle_group (e.g. "Upper Chest", "Side Delt Shoulder")
// into a broad display category, since exercises are logged with specific
// muscle group labels but the list should group by the general body part.
export function getExerciseCategory(muscleGroup: string | null): string {
  if (!muscleGroup) return 'OTHER';
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(muscleGroup)) return category;
  }
  return 'OTHER';
}

export function categoryRank(category: string): number {
  const index = CATEGORY_ORDER.indexOf(category as (typeof CATEGORY_ORDER)[number]);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

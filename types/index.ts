export interface Exercise {
  id: number;
  name: string;
  muscle_group: string | null;
  created_at: string;
}

export interface Session {
  id: number;
  date: string;
  duration_seconds: number | null;
  name: string | null;
  notes: string | null;
}

export interface Routine {
  id: number;
  name: string;
  created_at: string;
}

export interface WorkoutSet {
  id: number;
  session_id: number;
  exercise_id: number;
  weight: number;
  reps: number;
  set_order: number;
  rest_seconds: number | null;
}

export interface BodyWeightEntry {
  id: number;
  weight: number;
  date: string;
}

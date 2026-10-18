// AI levels: depth/time budgets with optional root jitter for human-like weak play.

export interface AiLevel {
  name: string;
  depth: number;
  timeMs: number;
  /** Centipawns of uniform noise added to root scores — 0 for full strength. */
  jitter: number;
}

export const LEVELS: AiLevel[] = [
  { name: 'Easy', depth: 1, timeMs: 400, jitter: 160 },
  { name: 'Casual', depth: 2, timeMs: 700, jitter: 70 },
  { name: 'Normal', depth: 4, timeMs: 1600, jitter: 25 },
  { name: 'Hard', depth: 6, timeMs: 2800, jitter: 0 },
  { name: 'Very hard', depth: 8, timeMs: 4500, jitter: 0 },
  { name: 'Maximum', depth: 14, timeMs: 9000, jitter: 0 },
];

export const DEFAULT_LEVEL = 2; // Normal

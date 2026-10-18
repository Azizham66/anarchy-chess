// Move-quality verdicts for post-game review (shared by the analysis card and the board badge).

export type Verdict = 'Best' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder';

export const VERDICTS: Verdict[] = ['Best', 'Good', 'Inaccuracy', 'Mistake', 'Blunder'];

export const VERDICT_META: Record<Verdict, { symbol: string; bg: string; chip: string }> = {
  Best: { symbol: '★', bg: '#10b981', chip: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' },
  Good: { symbol: '✓', bg: '#64748b', chip: 'border-slate-400/40 bg-slate-400/10 text-slate-300' },
  Inaccuracy: { symbol: '?!', bg: '#eab308', chip: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-200' },
  Mistake: { symbol: '?', bg: '#f97316', chip: 'border-orange-500/50 bg-orange-500/15 text-orange-300' },
  Blunder: { symbol: '??', bg: '#ef4444', chip: 'border-rose-500/50 bg-rose-500/15 text-rose-300' },
};

/**
 * Classify ply i (position i-1 → i) by the mover's eval loss in pawns. `played`/`engineBest` are
 * notations; a match with the engine's own choice is always Best.
 */
export function classify(evals: (number | null)[], i: number, moverWhite: boolean, played?: string, engineBest?: string): Verdict | null {
  const a = evals[i - 1];
  const b = evals[i];
  if (a == null || b == null) return null;
  const loss = ((moverWhite ? 1 : -1) * (a - b)) / 100;
  if (loss >= 3) return 'Blunder';
  if (loss >= 1.5) return 'Mistake';
  if (loss >= 0.7) return 'Inaccuracy';
  if ((played && engineBest && played === engineBest) || loss <= 0.1) return 'Best';
  return 'Good';
}

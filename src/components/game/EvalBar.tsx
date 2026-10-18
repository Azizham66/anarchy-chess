import { cn } from '@/lib/utils';

interface Props {
  evalCp: number; // white perspective, centipawns
  depth: number | null;
  flipped: boolean;
}

/** White share of the bar, logistic in pawns — ±3 pawns ≈ 73/27. */
export function evalShare(cp: number): number {
  return 100 / (1 + Math.exp(-cp / 100 / 2.2));
}

export function formatEval(cp: number): string {
  if (Math.abs(cp) >= 1500) return cp > 0 ? 'W+' : 'B+';
  const p = cp / 100;
  return `${p > 0 ? '+' : ''}${p.toFixed(1)}`;
}

export function EvalBar({ evalCp, depth, flipped }: Props) {
  const white = evalShare(evalCp);
  return (
    <div className="flex flex-col items-center gap-1.5 self-stretch" data-testid="eval-bar">
      <div
        className={cn(
          'relative min-h-24 w-3 flex-1 overflow-hidden rounded-full border border-slate-700/60 bg-[#1e2230] shadow-md sm:w-4',
          flipped ? 'rotate-180' : '',
        )}
      >
        <div className="absolute inset-x-0 bottom-0 bg-white transition-[height] duration-500 ease-out" style={{ height: `${white}%` }} />
        <div className="absolute inset-x-0 top-1/2 h-px bg-violet-400/70" />
      </div>
      <span data-testid="eval-score" className="font-mono text-[10px] font-bold tracking-tight text-muted-foreground sm:text-xs" title={depth ? `search depth ${depth}` : undefined}>
        {formatEval(evalCp)}
      </span>
    </div>
  );
}

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import type { AnarchGame } from '@/hooks/useAnarchGame';
import { cn } from '@/lib/utils';
import { VERDICTS, VERDICT_META, classify } from './verdict';
import type { Verdict } from './verdict';

export function PostGameAnalysis({ g }: { g: AnarchGame }) {
  const { analysis, game, shownIndex, review } = g;
  if (!analysis) return null;
  const n = game.positions.length;
  const computed = analysis.evals.filter((e) => e != null).length;
  const data = analysis.evals.map((e, i) => ({ ply: i, eval: e == null ? null : Math.max(-8, Math.min(8, e / 100)) }));

  const counts: Record<Verdict, number> = { Best: 0, Good: 0, Inaccuracy: 0, Mistake: 0, Blunder: 0 };
  for (let i = 1; i < n; i++) {
    const v = classify(analysis.evals, i, game.positions[i - 1].turn === 0, game.notations[i - 1], analysis.best[i - 1]);
    if (v) counts[v]++;
  }
  const verdict = shownIndex > 0 ? classify(analysis.evals, shownIndex, game.positions[shownIndex - 1].turn === 0, game.notations[shownIndex - 1], analysis.best[shownIndex - 1]) : null;
  const preferred = shownIndex > 0 ? analysis.best[shownIndex - 1] : '';

  const go = (i: number) => review(Math.max(0, Math.min(n - 1, i)));

  return (
    <section data-testid="post-game-analysis" className="animate-rise w-full rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Post-game analysis</p>
          <h3 className="font-heading text-lg font-bold tracking-tight">Engine review</h3>
        </div>
        {!analysis.done && (
          <span data-testid="analysis-progress" className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> {computed}/{n}
          </span>
        )}
      </div>

      <div className="mt-3 h-36 w-full" data-testid="analysis-graph">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 6, right: 6, bottom: 0, left: -26 }}
            onClick={(s) => {
              const idx = (s as { activeTooltipIndex?: number } | null)?.activeTooltipIndex;
              if (typeof idx === 'number') go(idx);
            }}
          >
            <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis dataKey="ply" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis domain={[-8, 8]} ticks={[-8, -4, 0, 4, 8]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
            <ReferenceLine x={shownIndex} stroke="#f59e0b" strokeWidth={1.5} />
            <Tooltip
              contentStyle={{ background: '#1e2230', border: '1px solid #282d3f', borderRadius: 8, fontSize: 12 }}
              labelFormatter={(label) => `Ply ${String(label)}`}
              formatter={(value) => {
                const v = Number(value);
                return [`${v > 0 ? '+' : ''}${v.toFixed(2)}`, 'Eval'];
              }}
            />
            <Line type="monotone" dataKey="eval" stroke="#a78bfa" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {VERDICTS.map((k) => (
          <span key={k} data-testid={`verdict-count-${k.toLowerCase()}`} className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold', VERDICT_META[k].chip)}>
            {counts[k]} {k}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <Button size="icon-sm" variant="secondary" data-testid="review-first-button" onClick={() => go(0)} aria-label="First position"><ChevronFirst className="size-4" /></Button>
        <Button size="icon-sm" variant="secondary" data-testid="review-prev-button" onClick={() => go(shownIndex - 1)} aria-label="Previous"><ChevronLeft className="size-4" /></Button>
        <Button size="icon-sm" variant="secondary" data-testid="review-next-button" onClick={() => go(shownIndex + 1)} aria-label="Next"><ChevronRight className="size-4" /></Button>
        <Button size="icon-sm" variant="secondary" data-testid="review-last-button" onClick={() => go(n - 1)} aria-label="Final position"><ChevronLast className="size-4" /></Button>
        <span className="ml-2 font-mono text-xs text-muted-foreground" data-testid="review-ply">ply {shownIndex}/{n - 1}</span>
      </div>

      <div className="mt-3 min-h-10 text-sm" data-testid="review-detail">
        {shownIndex > 0 ? (
          <>
            <span className="text-foreground/90">{game.notations[shownIndex - 1]}</span>
            {verdict && (
              <span data-testid="review-verdict" className={cn('ml-2 rounded-full border px-2 py-0.5 text-xs font-semibold', VERDICT_META[verdict].chip)}>{verdict}</span>
            )}
            {verdict && verdict !== 'Good' && verdict !== 'Best' && preferred && (
              <p className="mt-1 text-xs text-muted-foreground" data-testid="review-preferred">Engine preferred: {preferred}</p>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">Start position — step through the game or tap the graph.</span>
        )}
      </div>
    </section>
  );
}

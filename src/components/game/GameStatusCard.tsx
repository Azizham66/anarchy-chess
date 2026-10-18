import { AlertTriangle, Crown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { inCheck, livingAllies } from '@/engine';
import type { AnarchGame } from '@/hooks/useAnarchGame';
import { cn } from '@/lib/utils';
import { GLYPH, PIECE_NAME, REASON_TEXT, moveKindLabel } from './pieces';

export function GameStatusCard({ g }: { g: AnarchGame }) {
  const { game, shown, thinking, aiInfo, viewIndex, selected } = g;
  const turnName = shown.turn === 0 ? 'White' : 'Black';
  const checked = !game.outcome && viewIndex === null && inCheck(shown, shown.turn);

  let status: string;
  if (viewIndex !== null) status = `Reviewing position after ply ${viewIndex}`;
  else if (game.outcome) {
    const o = game.outcome;
    status = o.winner === null ? `Draw — ${REASON_TEXT[o.reason]}` : `${o.winner === 0 ? 'White' : 'Black'} wins — ${REASON_TEXT[o.reason]}`;
  } else if (thinking) status = 'AI is thinking…';
  else status = `${turnName} to move`;

  // Selected piece summary: move counts per kind
  let selInfo = 'Tap a piece to see its moves.';
  if (selected !== null && viewIndex === null) {
    const p = shown.board[selected];
    const counts = new Map<string, number>();
    for (const m of game.legal) if (m.from === selected) counts.set(moveKindLabel(m), (counts.get(moveKindLabel(m)) ?? 0) + 1);
    selInfo = `${PIECE_NAME[p & 7]}: ${counts.size ? [...counts].map(([k, v]) => `${v} ${k}`).join(' · ') : 'no legal moves'}`;
  }

  const lastNotation = viewIndex !== null ? (game.notations[viewIndex - 1] ?? 'Start position') : (game.notations[game.notations.length - 1] ?? '');

  // Pieces lost per color (captures + friendly fire)
  const lost: [number[], number[]] = [[], []];
  for (const e of game.effects.slice(0, g.shownIndex)) {
    for (const p of [e.captured, e.destroyed]) if (p !== 0) lost[p >> 3].push(p & 7);
  }

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-md" data-testid="game-status-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</p>
          <p data-testid="turn-indicator" className={cn('mt-1 flex items-center gap-2 font-heading text-lg font-bold tracking-tight', game.outcome && 'text-primary')}>
            {thinking && <Loader2 className="size-4 animate-spin text-primary" />}
            {game.outcome && <Crown className="size-4" />}
            {!game.outcome && viewIndex === null && (
              <span className={cn('inline-block size-3 rounded-full border border-slate-500', shown.turn === 0 ? 'bg-white' : 'bg-slate-900')} />
            )}
            {status}
          </p>
        </div>
        {game.forced && !game.outcome && viewIndex === null && (
          <Badge variant="destructive" data-testid="forced-badge">Forced King move</Badge>
        )}
      </div>

      {checked && (
        <div data-testid="check-warning" className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 dark:text-rose-300">
          <AlertTriangle className="size-4 shrink-0" />
          {turnName} is in check — you may ignore it, but the King can be captured.
        </div>
      )}

      <p data-testid="last-move" className="mt-3 min-h-5 text-sm text-foreground/85">{lastNotation}</p>
      <p data-testid="selection-info" className="mt-1 text-sm text-muted-foreground">{selInfo}</p>
      {aiInfo && !game.outcome && (
        <p className="mt-1 font-mono text-[11px] text-muted-foreground" data-testid="ai-info">
          AI searched depth {aiInfo.depth} · {(aiInfo.nodes / 1000).toFixed(0)}k nodes
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {([0, 1] as const).map((c) => (
          <div key={c} className="rounded-xl border border-border bg-panel px-3 py-2" data-testid={`ally-tracker-${c === 0 ? 'white' : 'black'}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{c === 0 ? 'White' : 'Black'} can emulate</p>
            <div className="mt-1 flex items-center gap-1.5">
              {livingAllies(shown, c).map(({ type, alive }) => (
                <span
                  key={type}
                  title={`${PIECE_NAME[type]} ${alive ? 'alive' : 'gone'}`}
                  data-testid={`ally-${c === 0 ? 'white' : 'black'}-${PIECE_NAME[type].toLowerCase()}-${alive ? 'alive' : 'dead'}`}
                  className={cn('piece-glyph text-xl transition-opacity duration-200', alive ? 'opacity-100' : 'line-through opacity-25')}
                >
                  {GLYPH[type]}
                  {'\uFE0E'}
                </span>
              ))}
            </div>
            <p className="mt-1 min-h-4 text-xs text-muted-foreground" data-testid={`lost-${c === 0 ? 'white' : 'black'}`}>
              Lost: {lost[c].length ? lost[c].sort((a, b) => b - a).map((t) => GLYPH[t] + '\uFE0E').join(' ') : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { KIND_META } from './pieces';
import type { KindKey } from './pieces';

const RULES: { title: string; body: string; kind?: KindKey }[] = [
  { title: 'Win', body: 'Capture the enemy King. There is no checkmate — check can be ignored, but you may never make your own King’s danger worse.' },
  { title: 'Emulation', kind: 'emu', body: 'A non-pawn piece may move as a weaker-or-equal piece (Q ≥ R ≥ B = N ≥ P), but only while you still have a living piece of that type. One move = one profile.' },
  { title: 'Friendly jump', kind: 'jump', body: 'A slider may pass over exactly one friendly piece (not the King), destroying it, landing on an empty square. Enemy pieces can never be jumped.' },
  { title: 'Pawn anarchy', kind: 'tramp', body: 'Pawns may step diagonally onto an empty square, or trample a friendly piece straight ahead (not the King), destroying it.' },
  { title: 'King protection', kind: 'std', body: 'Only standard moves can capture or check a King. Anarch moves (emulation, jumps, tramples, steps) may never create a new check. The King’s own emulation is move-only.' },
  { title: 'Forced King move', body: 'In check with no legal move? The King must still step — even into attack — and usually gets captured. No moves and no check is a stalemate draw.' },
  { title: 'Emulated pawns', body: 'Forward 1, diagonal step, diagonal capture. No double step, en passant, promotion or trample. Real pawns promote on any pawn move (choose Q/R/B/N).' },
  { title: 'Draws', body: 'Stalemate, threefold repetition, the 50-move rule (no pawn move, capture or friendly fire in 100 plies) and dead positions (bare Kings ± one minor).' },
];

export function CheatSheet() {
  return (
    <div className="space-y-2" data-testid="cheat-sheet">
      <div className="flex flex-wrap gap-2 pb-1" data-testid="move-kind-legend">
        {(Object.keys(KIND_META) as KindKey[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-2.5 py-1 text-xs">
            <span className="size-2.5 rounded-full" style={{ background: KIND_META[k].color }} />
            {KIND_META[k].label}
          </span>
        ))}
      </div>
      {RULES.map((r) => (
        <details key={r.title} className="group rounded-xl border border-border bg-panel px-3 py-2 open:bg-accent/60" data-testid={`cheat-${r.title.toLowerCase().replace(/\s+/g, '-')}`}>
          <summary className="flex cursor-pointer list-none items-center gap-2 font-heading text-sm font-semibold">
            {r.kind && <span className="size-2 rounded-full" style={{ background: KIND_META[r.kind].color }} />}
            {r.title}
            <span className="ml-auto text-muted-foreground transition-transform duration-150 group-open:rotate-45">+</span>
          </summary>
          <p className="mt-1.5 text-sm text-muted-foreground">{r.body}</p>
        </details>
      ))}
    </div>
  );
}

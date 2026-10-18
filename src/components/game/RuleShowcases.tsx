import { ArrowUpRight } from 'lucide-react';
import type { AnarchGame } from '@/hooks/useAnarchGame';
import { KIND_META } from './pieces';
import type { KindKey } from './pieces';

export const SHOWCASES: { id: string; name: string; fen: string; kind: KindKey; caption: string }[] = [
  {
    id: 'friendly-jump',
    name: 'Friendly jump',
    fen: '4k3/8/8/8/8/P7/8/R3K3 w - - 0 1',
    kind: 'jump',
    caption: 'Select the rook on a1. It can fly over its own pawn on a3 (destroying it) and land on a4–a7. a8 is blocked: a jump may never give check.',
  },
  {
    id: 'trample',
    name: 'Trample + Living Ally',
    fen: '4k3/8/8/4N3/4P3/8/8/R3K3 w - - 0 1',
    kind: 'tramp',
    caption: 'The rook can hop like a knight (purple) only because your knight on e5 lives. Trample it with the e4 pawn, then select the rook again — the power is gone.',
  },
  {
    id: 'emulation',
    name: 'Emulation',
    fen: '4k3/8/8/8/3R4/8/8/4K2B w - - 0 1',
    kind: 'emu',
    caption: 'Your rook slides diagonally because your bishop on h1 is alive. A rook can never emulate a Queen, so it never gets both at once.',
  },
  {
    id: 'king-protected',
    name: 'King is protected',
    fen: '7k/8/8/8/8/8/8/R3K2B w - - 0 1',
    kind: 'std',
    caption: 'The rook’s bishop-slide runs a1 → g7 but never onto h8. Anarch moves can’t capture or check the King — only standard moves can.',
  },
  {
    id: 'forced-king',
    name: 'Forced King move',
    fen: 'k7/8/8/8/8/8/1R6/R3K3 b - - 0 1',
    kind: 'tramp',
    caption: 'Black is in check with every escape covered. No checkmate in Anarch Chess: the King must still step — into attack — and White captures it next turn.',
  },
];

export function RuleShowcases({ g }: { g: AnarchGame }) {
  return (
    <div className="space-y-2" data-testid="rule-showcases">
      <p className="text-sm text-muted-foreground">Load a position, then play it out on the board (both sides are yours).</p>
      {SHOWCASES.map((s) => (
        <button
          key={s.id}
          type="button"
          data-testid={`rule-showcase-${s.id}`}
          onClick={() => g.newGame('showcase', s.fen, s.caption)}
          className="group flex w-full items-start gap-3 rounded-xl border border-border bg-panel p-3 text-left transition-[background-color,border-color,transform] duration-150 hover:border-violet-500/50 hover:bg-accent active:scale-[0.99]"
        >
          <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: KIND_META[s.kind].color, boxShadow: `0 0 10px ${KIND_META[s.kind].color}` }} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between font-heading text-sm font-semibold">
              {s.name}
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
            <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{s.caption}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

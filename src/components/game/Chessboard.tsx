import { motion } from 'motion/react';
import { KING, colorOf, inCheck, sqName, typeOf } from '@/engine';
import type { Move, Position } from '@/engine';
import { cn } from '@/lib/utils';
import type { MoveEffect } from '@/hooks/useAnarchGame';
import { GLYPH, KIND_META, PIECE_CODE } from './pieces';
import { VERDICT_META } from './verdict';
import type { Verdict } from './verdict';

interface Props {
  pos: Position;
  flipped: boolean;
  selected: number | null;
  targets: Map<number, Move>;
  lastMove: Move | null;
  lastEffect: MoveEffect | null;
  moveKey: number; // changes every ply — re-keys the moved piece so its slide replays
  interactive: boolean;
  /** Review verdict for the last move — drawn as a badge on its destination square. */
  verdict?: Verdict | null;
  onSquare: (sq: number) => void;
}

export function Chessboard({ pos, flipped, selected, targets, lastMove, lastEffect, moveKey, interactive, verdict, onSquare }: Props) {
  const checked = new Set<number>();
  for (const c of [0, 1] as const) if (pos.kings[c] >= 0 && inCheck(pos, c)) checked.add(pos.kings[c]);

  const squares = [];
  for (let j = 0; j < 64; j++) {
    const i = flipped ? 63 - j : j;
    const r = i >> 3;
    const c = i & 7;
    const light = (r + c) % 2 === 0;
    const p = pos.board[i];
    const target = targets.get(i);
    const isLast = lastMove !== null && (lastMove.from === i || lastMove.to === i);
    const name = sqName(i);

    // Slide the piece that just landed from its origin (offsets in square units).
    let slide: { x: string; y: string } | null = null;
    if (lastMove && lastMove.to === i && p !== 0) {
      const dc = (lastMove.from & 7) - c;
      const dr = (lastMove.from >> 3) - r;
      const sx = flipped ? -dc : dc;
      const sy = flipped ? -dr : dr;
      slide = { x: `${sx * 100}%`, y: `${sy * 100}%` };
    }
    const destroyedHere =
      lastMove !== null &&
      lastEffect !== null &&
      ((lastMove.removed === i && lastEffect.destroyed !== 0 && lastMove.kind === 'jump') ||
        (lastMove.to === i && lastMove.kind === 'tramp'));

    squares.push(
      <button
        type="button"
        key={i}
        data-testid={`square-${name}`}
        aria-label={`${name}${p ? ` ${colorOf(p) === 0 ? 'white' : 'black'} ${PIECE_CODE[typeOf(p)]}` : ''}`}
        onClick={() => onSquare(i)}
        className={cn(
          'relative flex items-center justify-center overflow-visible outline-none',
          light ? 'bg-sq-light' : 'bg-sq-dark',
          interactive ? 'cursor-pointer hover:brightness-[1.06]' : 'cursor-default',
          'transition-[filter] duration-100',
        )}
      >
        {isLast && <span className="pointer-events-none absolute inset-0 bg-amber-300/40" />}
        {selected === i && <span className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_3px_var(--kind-emu)] bg-violet-500/15" />}
        {checked.has(i) && (
          <span data-testid={`check-glow-${name}`} className="pointer-events-none absolute inset-0 animate-check-pulse" />
        )}
        {(j & 7) === 0 && (
          <span className={cn('pointer-events-none absolute left-[3px] top-[2px] font-mono text-[9px] font-bold sm:text-[11px]', light ? 'text-[#a17a52]' : 'text-[#e9dfcb]')}>
            {8 - r}
          </span>
        )}
        {j >> 3 === 7 && (
          <span className={cn('pointer-events-none absolute bottom-[1px] right-[3px] font-mono text-[9px] font-bold sm:text-[11px]', light ? 'text-[#a17a52]' : 'text-[#e9dfcb]')}>
            {'abcdefgh'[c]}
          </span>
        )}
        {destroyedHere && (
          <span key={`crash-${moveKey}`} className="pointer-events-none absolute inset-[8%] z-10 animate-crash rounded-full border-4" style={{ borderColor: lastMove?.kind === 'tramp' ? 'var(--kind-tramp)' : 'var(--kind-jump)' }} />
        )}
        {p !== 0 && (
          <motion.span
            key={slide ? `m-${moveKey}` : `s-${i}-${p}`}
            data-testid={`piece-${colorOf(p) === 0 ? 'w' : 'b'}-${PIECE_CODE[typeOf(p)]}-${name}`}
            initial={slide ? { x: slide.x, y: slide.y } : false}
            animate={{ x: 0, y: 0, scale: selected === i ? 1.08 : 1 }}
            transition={{ type: 'tween', duration: slide ? 0.26 : 0.14, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(
              'piece-glyph relative z-20 flex h-full w-full select-none items-center justify-center text-[clamp(26px,10.2vw,58px)] lg:text-[clamp(30px,4.6vw,60px)]',
              colorOf(p) === 0 ? 'piece-white' : 'piece-black',
              typeOf(p) === KING && checked.has(i) && 'drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]',
            )}
          >
            {GLYPH[typeOf(p)]}
            {'\uFE0E'}
          </motion.span>
        )}
        {verdict && lastMove && lastMove.to === i && (
          <span
            data-testid={`verdict-badge-${verdict.toLowerCase()}`}
            title={verdict}
            className="pointer-events-none absolute right-0.5 top-0.5 z-40 grid size-[42%] max-h-7 max-w-7 animate-marker-in place-items-center rounded-full border-2 border-white/90 font-mono text-[10px] font-black text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:text-xs"
            style={{ background: VERDICT_META[verdict].bg }}
          >
            {VERDICT_META[verdict].symbol}
          </span>
        )}
        {target && (
          <span
            data-testid={`move-marker-${target.kind}-${name}`}
            className={cn(
              'pointer-events-none absolute z-30 animate-marker-in rounded-full',
              p !== 0 ? 'inset-[6%] border-[4px] bg-transparent' : 'inset-[33%] opacity-90 shadow-[0_0_10px_rgba(0,0,0,0.25)]',
            )}
            style={p !== 0 ? { borderColor: KIND_META[target.kind].color } : { background: KIND_META[target.kind].color }}
          />
        )}
      </button>,
    );
  }

  return (
    <div
      data-testid="chessboard"
      className="relative aspect-square w-full rounded-2xl border border-[#44382c]/60 bg-gradient-to-b from-[#2a241e] to-[#171410] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.55)] sm:p-2.5"
    >
      <div className="grid h-full w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-xl border border-[#30261c] shadow-inner">
        {squares}
      </div>
    </div>
  );
}

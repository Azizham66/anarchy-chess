// Shared UI vocabulary for pieces and move kinds.
import type { Move } from '@/engine';

export const GLYPH: Record<number, string> = { 1: '♟', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚' };
export const PIECE_NAME: Record<number, string> = { 1: 'Pawn', 2: 'Knight', 3: 'Bishop', 4: 'Rook', 5: 'Queen', 6: 'King' };
export const PIECE_CODE: Record<number, string> = { 1: 'p', 2: 'n', 3: 'b', 4: 'r', 5: 'q', 6: 'k' };

export type KindKey = 'std' | 'emu' | 'jump' | 'tramp';

export const KIND_META: Record<KindKey, { label: string; short: string; color: string }> = {
  std: { label: 'Standard', short: 'standard', color: 'var(--kind-std)' },
  emu: { label: 'Emulation / diagonal step', short: 'emulation', color: 'var(--kind-emu)' },
  jump: { label: 'Friendly jump', short: 'friendly jump', color: 'var(--kind-jump)' },
  tramp: { label: 'Trample', short: 'trample', color: 'var(--kind-tramp)' },
};

export function moveKindLabel(m: Move): string {
  if (m.kind === 'emu') return m.as === 0 ? 'diagonal step' : `as ${PIECE_NAME[m.as ?? 0]}`;
  return KIND_META[m.kind].short;
}

export const REASON_TEXT: Record<string, string> = {
  king_captured: 'King captured',
  stalemate: 'Stalemate',
  repetition: 'Threefold repetition',
  fifty_move: '50-move rule',
  dead_position: 'Dead position',
  resigned: 'Resignation',
};

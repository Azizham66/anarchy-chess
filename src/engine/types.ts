// Anarch Chess engine — core types. Pure data, no DOM, no I/O.
// Rulebook: ANARCH_CHESS_RULEBOOK_v1.1 (§ references throughout the engine).

export type Color = 0 | 1; // 0 = White, 1 = Black
export const WHITE: Color = 0;
export const BLACK: Color = 1;

// Piece type codes. A piece byte = type | (color << 3); 0 = empty square.
export const PAWN = 1;
export const KNIGHT = 2;
export const BISHOP = 3;
export const ROOK = 4;
export const QUEEN = 5;
export const KING = 6;
export type PieceType = 1 | 2 | 3 | 4 | 5 | 6;

// Move kinds (rulebook §11). Dedup priority when two moves share (from, to): std < emu < jump < tramp.
export type MoveKind = 'std' | 'emu' | 'jump' | 'tramp';

export interface Move {
  from: number;
  to: number;
  kind: MoveKind;
  /** Emulated profile: a PieceType, or 0 for the pawn's diagonal step (§5.2). Only on `emu` moves. */
  as?: number;
  /** Square cleared in addition to `to`: the jumped friendly piece or the en-passant pawn. */
  removed?: number;
  /** Castling: [rookFrom, rookTo]. */
  castle?: [number, number];
  /** Standard pawn double step — creates the en-passant square. */
  dbl?: boolean;
  /** Promoted piece type (default QUEEN, §8.3). Only on moves landing on the last rank. */
  promo?: number;
}

export interface Position {
  /** 64 squares, index 0 = a8 … 63 = h1 (FEN order). Values are piece bytes. */
  board: Int8Array;
  turn: Color;
  /** Castling rights bitmask: 1 = wK, 2 = wQ, 4 = bK, 8 = bQ. */
  castling: number;
  /** En-passant target square, -1 if none (only a standard double step creates one, §8.2). */
  ep: number;
  /** Plies since the last pawn move, capture or friendly-fire destruction (50-move rule, §9). */
  halfmove: number;
  /** [white king square, black king square] — tracked incrementally. */
  kings: [number, number];
  /** Zobrist hash/lock, maintained by makeMove/unmakeMove. */
  hash: number;
  lock: number;
}

export interface Undo {
  moved: number; // piece byte that moved
  captured: number; // piece byte captured on `to` (0 if none) — may be a friendly piece (trample)
  removedPiece: number; // piece byte on the `removed` square (0 if none)
  castling: number;
  ep: number;
  halfmove: number;
  prevHash: number;
  prevLock: number;
}

export type OutcomeReason =
  | 'king_captured' // §1/§7.2 — game ends the instant a King is captured
  | 'stalemate' // §7.3/§7.4
  | 'repetition' // §9 threefold
  | 'fifty_move' // §9 — 100 plies, §7 counter
  | 'dead_position'; // §9

export interface Outcome {
  /** Winning color, or null for a draw. */
  winner: Color | null;
  reason: OutcomeReason;
}

export const MOVE_KIND_PRIORITY: Record<MoveKind, number> = { std: 0, emu: 1, jump: 2, tramp: 3 };

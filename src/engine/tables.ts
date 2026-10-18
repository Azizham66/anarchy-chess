// Static tables: direction deltas, piece values, piece-square tables, emulation hierarchy.

import { BISHOP, KING, KNIGHT, PAWN, QUEEN, ROOK } from './types';

export const KNIGHT_D: ReadonlyArray<readonly [number, number]> = [
  [1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1],
];
export const KING_D: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];
export const ROOK_D: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const BISHOP_D: ReadonlyArray<readonly [number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

// Centipawn values (index by piece type). King's value only feeds move ordering, never material.
export const PIECE_VALUE: Readonly<number[]> = [0, 100, 320, 330, 500, 900, 20000];

export const TYPE_NAME: Readonly<string[]> = ['', 'Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King'];

// Piece-square tables — White's perspective, index 0 = a8 … 63 = h1 (FEN order), so a white
// piece indexes directly and a black piece mirrors with `i ^ 56`. Classic simplified tables.
export const PST_PAWN: Readonly<number[]> = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];
export const PST_KNIGHT: Readonly<number[]> = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];
export const PST_BISHOP: Readonly<number[]> = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];
export const PST_ROOK: Readonly<number[]> = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];
export const PST_QUEEN: Readonly<number[]> = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];
// King: this variant ends by King capture, so the "hunt" terms in eval.ts dominate; keep a mild
// table that only discourages wandering to the enemy side.
export const PST_KING: Readonly<number[]> = [
  -40, -40, -40, -40, -40, -40, -40, -40,
  -40, -40, -40, -40, -40, -40, -40, -40,
  -40, -40, -40, -40, -40, -40, -40, -40,
  -40, -40, -40, -40, -40, -40, -40, -40,
  -30, -30, -30, -30, -30, -30, -30, -30,
  -20, -20, -20, -20, -20, -20, -20, -20,
  10, 10, 0, 0, 0, 0, 10, 10,
  20, 30, 10, 0, 0, 10, 30, 20,
];

// Emulation hierarchy (§3.1): a piece may emulate profile B only if value(A) >= value(B), and only
// with a living ally of type B (§3.2). Rook/bishop profiles are omitted from the Queen — they are
// already part of her standard moves — and pawns emulate nothing (§5.3).
export const EMU_VALUE: Readonly<number[]> = [0, 1, 3, 3, 5, 9, 0];
export const EMULATES: ReadonlyArray<ReadonlyArray<number>> = [
  [], // (empty)
  [], // Pawn §5.3
  [BISHOP, PAWN], // Knight
  [KNIGHT, PAWN], // Bishop
  [BISHOP, KNIGHT, PAWN], // Rook
  [KNIGHT, PAWN], // Queen
  [ROOK, BISHOP, KNIGHT, PAWN], // King (move-only, §3.4)
];

// FEN board rows use lowercase for black.
export const CHAR_OF_TYPE = ['', 'P', 'N', 'B', 'R', 'Q', 'K'];

export { KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN };

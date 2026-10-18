// Game-level API: persistent move application, outcome/draw detection (§1, §7.3, §9),
// human-readable notation, living-ally queries and worker serialization.

import { WHITE } from './types';
import type { Color, Move, Outcome, Position } from './types';
import { clonePos, colorOf, computeKeys, fenOf, posFromFen, sqName, typeOf } from './board';
import { makeMove } from './make';
import { attackersOf } from './attacks';
import { legalMoves, inCheck } from './legality';
import { TYPE_NAME } from './tables';

/** Deep-copies `pos`, applies `m`, and returns the new position plus capture info. */
export function applyMoveCopy(
  pos: Position,
  m: Move,
): { pos: Position; captured: number; destroyed: number } {
  const next = clonePos(pos);
  const u = makeMove(next, m);
  return { pos: next, captured: u.captured, destroyed: u.removedPiece };
}

/** Repetition key (§9): board + side to move + castling rights + en-passant square. */
export function positionKey(pos: Position): string {
  return `${pos.board.join(',')}|${pos.turn}|${pos.castling}|${pos.ep}`;
}

/** §9 dead position: only Kings remain, or Kings plus a single Bishop or Knight. */
export function isDeadPosition(board: Int8Array): boolean {
  const rest: number[] = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p !== 0 && (p & 7) !== 6) rest.push(p & 7);
  }
  if (rest.length === 0) return true;
  return rest.length === 1 && (rest[0] === 3 || rest[0] === 2); // B or N
}

/**
 * Outcome after a move (§10.6). `legal` is the legal-move list for the side to move on `pos`,
 * `keys` holds every position key so far (including `pos`), and `kingCaptured` is the color of
 * the King captured by the last move (or null).
 */
export function gameOutcome(
  pos: Position,
  legal: Move[],
  keys: string[],
  kingCaptured: Color | null,
): Outcome | null {
  if (kingCaptured !== null) return { winner: (1 - kingCaptured) as Color, reason: 'king_captured' };
  // legalMoves already returns the §7.4 forced set when in check, so an empty list is a
  // stalemate draw either way (§7.3, or §7.4 with no King step available).
  if (legal.length === 0) return { winner: null, reason: 'stalemate' };
  if (pos.halfmove >= 100) return { winner: null, reason: 'fifty_move' };
  const key = positionKey(pos);
  let seen = 0;
  for (const k of keys) if (k === key) seen++;
  if (seen >= 2) return { winner: null, reason: 'repetition' }; // current + 2 earlier = threefold
  if (isDeadPosition(pos.board)) return { winner: null, reason: 'dead_position' };
  return null;
}

/** Human-readable move description, e.g. "White: Rook a1 → a4 (friendly jump, destroyed Pawn on a3)". */
export function moveToNotation(pos: Position, m: Move): string {
  const p = pos.board[m.from];
  const me = colorOf(p);
  const T = typeOf(p);
  const target = pos.board[m.to];
  let s = `${TYPE_NAME[T]} ${sqName(m.from)}${target !== 0 ? ' × ' : ' → '}${sqName(m.to)}`;
  if (m.kind === 'emu') {
    s += m.as === 0 ? ' (diagonal step)' : ` (emulating ${TYPE_NAME[m.as ?? 0]})`;
  } else if (m.kind === 'jump' && m.removed !== undefined && m.removed >= 0) {
    const victim = pos.board[m.removed];
    s += ` (friendly jump, destroyed ${TYPE_NAME[typeOf(victim)]} on ${sqName(m.removed)})`;
  } else if (m.kind === 'tramp' && target !== 0) {
    s += ` (trample, destroyed ${TYPE_NAME[typeOf(target)]})`;
  }
  if (m.castle) s += ' (castles)';
  if (m.promo) s += ` (promotes to ${TYPE_NAME[m.promo]})`;
  return `${me === WHITE ? 'White' : 'Black'}: ${s}`;
}

/** Which piece types currently have a living ally for `color` — drives the "can emulate" tracker. */
export function livingAllies(pos: Position, color: Color): { type: number; alive: boolean }[] {
  const alive = [false, false, false, false, false, false, false];
  for (let i = 0; i < 64; i++) {
    const p = pos.board[i];
    if (p !== 0 && colorOf(p) === color) alive[p & 7] = true;
  }
  return [4, 3, 2, 1].map((t) => ({ type: t, alive: alive[t] })); // R, B, N, P
}

/** Attacker squares on a king — used by the UI for the check glow. */
export function checkGivers(pos: Position, color: Color): number[] {
  return attackersOf(pos.board, pos.kings[color], (1 - color) as Color);
}

// --- worker serialization (structured-clone friendly plain objects) ---
export interface SerializedPosition {
  b: number[];
  t: Color;
  c: number;
  ep: number;
  hm: number;
}

export function serializePos(pos: Position): SerializedPosition {
  return {
    b: Array.from(pos.board),
    t: pos.turn,
    c: pos.castling,
    ep: pos.ep,
    hm: pos.halfmove,
  };
}

export function deserializePos(s: SerializedPosition): Position {
  const board = Int8Array.from(s.b);
  const kings: [number, number] = [-1, -1];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p !== 0 && (p & 7) === 6) kings[p >> 3] = i;
  }
  const pos: Position = { board, turn: s.t, castling: s.c, ep: s.ep, halfmove: s.hm, kings, hash: 0, lock: 0 };
  computeKeys(pos);
  return pos;
}

export { posFromFen, fenOf, clonePos, sqName, sqFromName, colorOf, typeOf } from './board';
export { legalMoves, inCheck } from './legality';
export { attackersOf, isAttacked } from './attacks';
export { START_FEN } from './board';

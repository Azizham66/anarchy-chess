// Legality pipeline (rulebook §10.3/§10.4): pseudo moves → terminal King-capture → self-check
// (§7.1) → new-check rejection for anarch moves (§6) → forced King moves when nothing remains (§7.4).

import type { Move, Position } from './types';
import { generateMoves } from './generate';
import { makeMove, unmakeMove } from './make';
import { attackersOf, isAttacked } from './attacks';
import { colorOf, typeOf } from './board';
import { KING } from './tables';

export interface LegalResult {
  moves: Move[];
  /** True when the returned list is the §7.4 forced-King-move set (no safe move existed). */
  forced: boolean;
}

/**
 * All legal moves for the side to move.
 * `promoPieces` forwards to the generator — pass the full promotion choice list for UI use;
 * the search keeps the default (auto-Queen) for speed.
 */
/** Per-node legality context — the §7.1 / §6 "before" attacker sets, computed once per node. */
export interface LegalCtx {
  me: 0 | 1;
  opp: 0 | 1;
  myKing: number;
  enemyKing: number;
  selfInCheck: boolean;
  beforeSelf: Set<number> | null;
  beforeEnemy: Set<number>;
}

export function legalCtx(pos: Position): LegalCtx {
  const me = pos.turn;
  const opp = (1 - me) as 0 | 1;
  const myKing = pos.kings[me];
  const enemyKing = pos.kings[opp];
  const bs = attackersOf(pos.board, myKing, opp);
  return {
    me,
    opp,
    myKing,
    enemyKing,
    selfInCheck: bs.length > 0,
    beforeSelf: bs.length > 0 ? new Set(bs) : null,
    beforeEnemy: new Set(attackersOf(pos.board, enemyKing, me)),
  };
}

/**
 * Legality of a pseudo move evaluated on the position AFTER makeMove (§10.3.3–4).
 * Call with the post-move board; `kingMoved` = the mover was the King.
 */
export function legalAfterMake(pos: Position, m: Move, kingMoved: boolean, x: LegalCtx): boolean {
  const board = pos.board;
  // §7.1 self-check
  if (kingMoved) {
    if (isAttacked(board, m.to, x.opp)) return false;
  } else if (!x.selfInCheck) {
    if (isAttacked(board, x.myKing, x.opp)) return false;
  } else {
    const after = attackersOf(board, x.myKing, x.opp);
    for (let k = 0; k < after.length; k++) if (!x.beforeSelf!.has(after[k])) return false;
  }
  // §6 — anarch moves may never create a NEW check (incl. discovered / promotion checks)
  if (m.kind !== 'std' && isAttacked(board, x.enemyKing, x.me)) {
    const afterE = attackersOf(board, x.enemyKing, x.me);
    for (let k = 0; k < afterE.length; k++) if (!x.beforeEnemy.has(afterE[k])) return false;
  }
  return true;
}

/** True when the pseudo move captures the enemy King (§10.3.1 — always legal, game over). */
export function capturesKing(pos: Position, m: Move): boolean {
  const t = pos.board[m.to];
  return t !== 0 && typeOf(t) === KING;
}

/** §7.4 forced set: standard single-step King moves (no castling), even into attack. */
export function forcedKingMoves(pseudo: Move[], kingSq: number): Move[] {
  return pseudo.filter((m) => m.from === kingSq && m.kind === 'std' && !m.castle);
}

/**
 * All legal moves for the side to move.
 * `promoPieces` forwards to the generator — pass the full promotion choice list for UI use;
 * the search keeps the default (auto-Queen) for speed.
 */
export function legalMoves(pos: Position, promoPieces?: number[] | null): LegalResult {
  const pseudo = generateMoves(pos, promoPieces);
  const x = legalCtx(pos);
  const out: Move[] = [];
  for (let i = 0; i < pseudo.length; i++) {
    const m = pseudo[i];
    if (capturesKing(pos, m)) {
      out.push(m);
      continue;
    }
    const u = makeMove(pos, m);
    const ok = legalAfterMake(pos, m, typeOf(u.moved) === KING, x);
    unmakeMove(pos, m, u);
    if (ok) out.push(m);
  }
  if (out.length > 0) return { moves: out, forced: false };
  if (x.selfInCheck) {
    const forced = forcedKingMoves(pseudo, x.myKing);
    if (forced.length > 0) return { moves: forced, forced: true };
  }
  return { moves: [], forced: false };
}

/** Convenience: is `color`'s King standard-attacked right now? (Check may be ignored, §1.) */
export function inCheck(pos: Position, color: 0 | 1): boolean {
  return isAttacked(pos.board, pos.kings[color], (1 - color) as 0 | 1);
}

/** Guard kept for consumers that want the mover color of a move in context. */
export function moverOf(pos: Position, m: Move): 0 | 1 {
  return colorOf(pos.board[m.from]);
}

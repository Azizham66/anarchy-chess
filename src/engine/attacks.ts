// Standard attacks (rulebook §2): squares a piece attacks with its own capture pattern.
// Sliders are blocked by any piece; pawns attack diagonally forward; kings attack adjacent squares.

import { BLACK, WHITE } from './types';
import type { Color } from './types';
import { BISHOP_D, KING_D, KNIGHT_D, ROOK_D } from './tables';
import { colorOf, typeOf } from './board';

const PIECE_DIRS: ReadonlyArray<readonly [number, ReadonlyArray<readonly [number, number]>]> = [
  [4, ROOK_D],
  [5, ROOK_D],
  [3, BISHOP_D],
  [5, BISHOP_D],
];

/** Do any pieces of color `by` standard-attack square `sq`? Early-exit boolean. */
export function isAttacked(board: Int8Array, sq: number, by: Color): boolean {
  const r = sq >> 3;
  const c = sq & 7;
  // Pawns: a white pawn on (r+1, c±1) attacks (r, c); a black pawn on (r-1, c±1).
  const pr = by === WHITE ? r + 1 : r - 1;
  if (pr >= 0 && pr < 8) {
    const code = 1 | (by << 3); // PAWN | color
    if (c > 0 && board[pr * 8 + c - 1] === code) return true;
    if (c < 7 && board[pr * 8 + c + 1] === code) return true;
  }
  // Knights
  const nCode = 2 | (by << 3);
  for (let k = 0; k < 8; k++) {
    const rr = r + KNIGHT_D[k][0];
    const cc = c + KNIGHT_D[k][1];
    if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
    if (board[rr * 8 + cc] === nCode) return true;
  }
  // King
  const kCode = 6 | (by << 3);
  for (let k = 0; k < 8; k++) {
    const rr = r + KING_D[k][0];
    const cc = c + KING_D[k][1];
    if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
    if (board[rr * 8 + cc] === kCode) return true;
  }
  // Sliders: rook/queen orthogonals, bishop/queen diagonals — first piece on the ray decides.
  for (let set = 0; set < 2; set++) {
    const dirs = set === 0 ? ROOK_D : BISHOP_D;
    const rCode = (set === 0 ? 4 : 3) | (by << 3);
    const qCode = 5 | (by << 3);
    for (let k = 0; k < 4; k++) {
      let rr = r + dirs[k][0];
      let cc = c + dirs[k][1];
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const p = board[rr * 8 + cc];
        if (p !== 0) {
          if (colorOf(p) === by && (p === rCode || p === qCode)) return true;
          break;
        }
        rr += dirs[k][0];
        cc += dirs[k][1];
      }
    }
  }
  return false;
}

/** Squares holding pieces of color `by` that standard-attack square `sq` (the §2 "attacker set"). */
export function attackersOf(board: Int8Array, sq: number, by: Color): number[] {
  const out: number[] = [];
  if (sq < 0) return out;
  const r = sq >> 3;
  const c = sq & 7;
  const pr = by === WHITE ? r + 1 : r - 1;
  if (pr >= 0 && pr < 8) {
    const code = 1 | (by << 3);
    if (c > 0 && board[pr * 8 + c - 1] === code) out.push(pr * 8 + c - 1);
    if (c < 7 && board[pr * 8 + c + 1] === code) out.push(pr * 8 + c + 1);
  }
  const nCode = 2 | (by << 3);
  for (let k = 0; k < 8; k++) {
    const rr = r + KNIGHT_D[k][0];
    const cc = c + KNIGHT_D[k][1];
    if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
    if (board[rr * 8 + cc] === nCode) out.push(rr * 8 + cc);
  }
  const kCode = 6 | (by << 3);
  for (let k = 0; k < 8; k++) {
    const rr = r + KING_D[k][0];
    const cc = c + KING_D[k][1];
    if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
    if (board[rr * 8 + cc] === kCode) out.push(rr * 8 + cc);
  }
  for (let set = 0; set < 2; set++) {
    const dirs = set === 0 ? ROOK_D : BISHOP_D;
    const rCode = (set === 0 ? 4 : 3) | (by << 3);
    const qCode = 5 | (by << 3);
    for (let k = 0; k < 4; k++) {
      let rr = r + dirs[k][0];
      let cc = c + dirs[k][1];
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const p = board[rr * 8 + cc];
        if (p !== 0) {
          if (colorOf(p) === by && (p === rCode || p === qCode)) out.push(rr * 8 + cc);
          break;
        }
        rr += dirs[k][0];
        cc += dirs[k][1];
      }
    }
  }
  return out;
}

/** Bitset of every square standard-attacked by color `by` (used by the evaluation). */
export function attackMap(board: Int8Array, by: Color): Uint8Array {
  const m = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p === 0 || colorOf(p) !== by) continue;
    const T = typeOf(p);
    const r = i >> 3;
    const c = i & 7;
    if (T === 1) {
      const rr = by === WHITE ? r - 1 : r + 1;
      if (rr >= 0 && rr < 8) {
        if (c > 0) m[rr * 8 + c - 1] = 1;
        if (c < 7) m[rr * 8 + c + 1] = 1;
      }
    } else if (T === 2) {
      for (let k = 0; k < 8; k++) {
        const rr = r + KNIGHT_D[k][0];
        const cc = c + KNIGHT_D[k][1];
        if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) m[rr * 8 + cc] = 1;
      }
    } else if (T === 6) {
      for (let k = 0; k < 8; k++) {
        const rr = r + KING_D[k][0];
        const cc = c + KING_D[k][1];
        if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) m[rr * 8 + cc] = 1;
      }
    } else {
      const dirs = T === 4 ? ROOK_D : T === 3 ? BISHOP_D : KING_D;
      for (const [dr, dc] of dirs) {
        let rr = r + dr;
        let cc = c + dc;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          m[rr * 8 + cc] = 1;
          if (board[rr * 8 + cc] !== 0) break;
          rr += dr;
          cc += dc;
        }
      }
    }
  }
  return m;
}

export const opponentOf = (c: Color): Color => (c === WHITE ? BLACK : WHITE);

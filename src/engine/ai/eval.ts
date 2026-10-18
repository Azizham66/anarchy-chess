// Evaluation — white-perspective centipawns. Material + piece-square tables + the king-hunt
// terms that matter most in a variant where capturing the King is the win condition.

import { BLACK, WHITE } from '../types';
import type { Color, Position } from '../types';
import { attackMap } from '../attacks';
import { colorOf, typeOf } from '../board';
import { PIECE_VALUE, PST_BISHOP, PST_KING, PST_KNIGHT, PST_PAWN, PST_QUEEN, PST_ROOK } from '../tables';

const CHEBY = new Int8Array(64 * 64);
for (let a = 0; a < 64; a++) {
  for (let b = 0; b < 64; b++) {
    CHEBY[a * 64 + b] = Math.max(Math.abs((a >> 3) - (b >> 3)), Math.abs((a & 7) - (b & 7)));
  }
}

/** Attack-pressure bonus on an enemy King (from the attacker's perspective, in cp). */
function hunt(map: Uint8Array, board: Int8Array, kingSq: number): number {
  if (kingSq < 0) return 0;
  const r = kingSq >> 3;
  const c = kingSq & 7;
  let att = 0;
  let esc = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
      const q = rr * 8 + cc;
      if (map[q] !== 0) att++;
      else if (board[q] === 0) esc++;
    }
  }
  const edge = Math.abs(c - 3.5) + Math.abs(r - 3.5); // 0 centre … 7 corner
  return (map[kingSq] !== 0 ? 40 : 0) + att * 8 - esc * 12 + edge * 6;
}

/** Static evaluation of `pos`, always from White's perspective. */
export function evaluate(pos: Position): number {
  const b = pos.board;
  const wk = pos.kings[0];
  const bk = pos.kings[1];
  let score = 0;
  let wMat = 0;
  let bMat = 0;
  let wProx = 0;
  let bProx = 0;

  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (p === 0) continue;
    const T = typeOf(p);
    const white = colorOf(p) === WHITE;
    const mir = white ? i : i ^ 56;
    let v = PIECE_VALUE[T];
    switch (T) {
      case 1:
        v += PST_PAWN[mir];
        break;
      case 2:
        v += PST_KNIGHT[mir];
        break;
      case 3:
        v += PST_BISHOP[mir];
        break;
      case 4:
        v += PST_ROOK[mir];
        break;
      case 5:
        v += PST_QUEEN[mir];
        break;
      case 6:
        v += PST_KING[mir];
        break;
    }
    if (white) {
      wMat += v;
      if (T !== 1 && T !== 6 && bk >= 0) wProx += (7 - CHEBY[i * 64 + bk]) * 3;
    } else {
      bMat += v;
      if (T !== 1 && T !== 6 && wk >= 0) bProx += (7 - CHEBY[i * 64 + wk]) * 3;
    }
  }

  score += wMat - bMat + wProx - bProx;
  score += hunt(attackMap(b, WHITE), b, bk) - hunt(attackMap(b, BLACK), b, wk);
  score += pos.turn === WHITE ? 10 : -10;
  return score;
}

/** Side-to-move perspective (negamax convention). */
export function evaluateSTM(pos: Position): number {
  const e = evaluate(pos);
  return pos.turn === WHITE ? e : -e;
}

export function colorName(c: Color): string {
  return c === WHITE ? 'White' : 'Black';
}

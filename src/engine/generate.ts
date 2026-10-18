// Pseudo-legal move generation (rulebook §10.1): standard moves (incl. castling, en passant,
// double step), emulation moves (only for profiles the piece may emulate with a living ally),
// friendly jumps, and pawn anarch moves (diagonal step, trample). Moves are deduplicated by
// (from, to) keeping the first by priority std → emu → jump → tramp (§10.2).

import { BLACK, WHITE } from './types';
import type { Color, Move, MoveKind, Position } from './types';
import { BISHOP_D, EMULATES, KING_D, KNIGHT_D, ROOK_D } from './tables';
import { colorOf, typeOf } from './board';
import { isAttacked } from './attacks';

const KIND_PR: Record<MoveKind, number> = { std: 0, emu: 1, jump: 2, tramp: 3 };

/**
 * Generate all pseudo-legal moves for the side to move.
 * `promoPieces` lists promotion choices (rulebook §8.3 — default auto-Queen); pass
 * [QUEEN, ROOK, BISHOP, KNIGHT] to expand every under-promotion variant for the UI.
 */
export function generateMoves(pos: Position, promoPieces?: number[] | null): Move[] {
  const board = pos.board;
  const me = pos.turn;
  const opp = (1 - me) as Color;
  const promos = promoPieces && promoPieces.length > 0 ? promoPieces : [5]; // QUEEN
  const fwd = me === WHITE ? -1 : 1; // row delta: white advances toward row 0 (rank 8)
  const startRow = me === WHITE ? 6 : 1;
  const promoRow = me === WHITE ? 0 : 7;

  const moves: Move[] = [];
  const seen = new Map<number, Move>();

  // Living-ally census for the side to move (§3.2)
  const alive = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p !== 0 && colorOf(p) === me) alive[p & 7]++;
  }

  const add = (m: Move): void => {
    const key = (m.from * 64 + m.to) * 8 + (m.promo ?? 0);
    const prev = seen.get(key);
    if (prev === undefined || KIND_PR[m.kind] < KIND_PR[prev.kind]) seen.set(key, m);
  };

  // Pawn moves that may reach the last rank promote (§8.3) — standard move, diagonal step or trample.
  const addPawn = (from: number, to: number, kind: MoveKind, extra: Partial<Move> | null): void => {
    if ((to >> 3) === promoRow) {
      for (const pr of promos) add(extra ? { from, to, kind, ...extra, promo: pr } : { from, to, kind, promo: pr });
    } else {
      add(extra ? { from, to, kind, ...extra } : { from, to, kind });
    }
  };

  // Generate one movement profile (own = std, or emulated) for the piece on square f.
  // §3.3: one move, one profile — a single line, leap or pawn step; profiles never combine.
  const genProfile = (f: number, profile: number, kind: MoveKind): void => {
    const isKing = typeOf(board[f]) === 6; // King emulation is move-only (§3.4)
    const isStd = kind === 'std';
    const r = f >> 3;
    const c = f & 7;

    if (profile === 2) {
      // Knight profile (§4.3 leaps ignore everything in between)
      for (let k = 0; k < 8; k++) {
        const rr = r + KNIGHT_D[k][0];
        const cc = c + KNIGHT_D[k][1];
        if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
        const t = rr * 8 + cc;
        const q = board[t];
        if (q === 0) {
          add({ from: f, to: t, kind, as: 2 });
        } else if (colorOf(q) === opp && (isStd || (!isKing && typeOf(q) !== 6))) {
          add({ from: f, to: t, kind, as: 2 });
        }
      }
    } else if (profile === 1) {
      // Emulated pawn (§3.5, non-pawn pieces only): forward 1 to empty, diagonal step to empty,
      // diagonal capture of a non-King enemy (never for the King). No double step / ep / promo / trample.
      const rr = r + fwd;
      if (rr >= 0 && rr < 8) {
        if (board[rr * 8 + c] === 0) add({ from: f, to: rr * 8 + c, kind, as: 1 });
        for (let dc = -1; dc <= 1; dc += 2) {
          const cc = c + dc;
          if (cc < 0 || cc > 7) continue;
          const t = rr * 8 + cc;
          const q = board[t];
          if (q === 0) {
            add({ from: f, to: t, kind, as: 1 });
          } else if (!isKing && colorOf(q) === opp && typeOf(q) !== 6) {
            add({ from: f, to: t, kind, as: 1 });
          }
        }
      }
    } else {
      // Slider profile (rook or bishop lines) with friendly-jump support (§4.1/§4.2)
      const dirs = profile === 4 ? ROOK_D : BISHOP_D;
      for (let k = 0; k < 4; k++) {
        const dr = dirs[k][0];
        const dc = dirs[k][1];
        let rr = r + dr;
        let cc = c + dc;
        let ally = -1;
        let jumped = 0;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          const t = rr * 8 + cc;
          const q = board[t];
          if (q === 0) {
            if (jumped === 0) add({ from: f, to: t, kind, as: profile });
            else add({ from: f, to: t, kind: 'jump', removed: ally });
          } else if (colorOf(q) === opp) {
            // Enemy pieces can never be jumped; capture only on an unobstructed path,
            // never for the King, and emulated profiles may never capture a King (§6).
            if (jumped === 0 && (isStd || (!isKing && typeOf(q) !== 6))) {
              add({ from: f, to: t, kind, as: profile });
            }
            break;
          } else {
            // Friendly piece: jumpable exactly once, never a King, never by the King (§4.2)
            if (isKing || typeOf(q) === 6 || jumped >= 1) break;
            jumped = 1;
            ally = t;
          }
          rr += dr;
          cc += dc;
        }
      }
    }
  };

  for (let f = 0; f < 64; f++) {
    const p = board[f];
    if (p === 0 || colorOf(p) !== me) continue;
    const T = p & 7;

    if (T === 5) {
      // Queen: standard rook + bishop lines
      genProfile(f, 4, 'std');
      genProfile(f, 3, 'std');
    } else if (T === 4 || T === 3 || T === 2) {
      genProfile(f, T, 'std');
    } else if (T === 6) {
      // King: single steps (captures allowed — including the enemy King, §7.2)
      const r = f >> 3;
      const c = f & 7;
      for (let k = 0; k < 8; k++) {
        const rr = r + KING_D[k][0];
        const cc = c + KING_D[k][1];
        if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
        const t = rr * 8 + cc;
        const q = board[t];
        if (q === 0 || colorOf(q) === opp) add({ from: f, to: t, kind: 'std' });
      }
      // Castling (§8.1): unmoved K+R, empty between, never out of / through / into attack.
      const home = me === WHITE ? 60 : 4;
      if (f === home && !isAttacked(board, home, opp)) {
        const kRight = me === WHITE ? 1 : 4;
        const qRight = me === WHITE ? 2 : 8;
        const rookCode = 4 | (me << 3);
        if (
          (pos.castling & kRight) !== 0 &&
          board[home + 3] === rookCode &&
          board[home + 1] === 0 &&
          board[home + 2] === 0 &&
          !isAttacked(board, home + 1, opp) &&
          !isAttacked(board, home + 2, opp)
        ) {
          add({ from: f, to: home + 2, kind: 'std', castle: [home + 3, home + 1] });
        }
        if (
          (pos.castling & qRight) !== 0 &&
          board[home - 4] === rookCode &&
          board[home - 1] === 0 &&
          board[home - 2] === 0 &&
          board[home - 3] === 0 &&
          !isAttacked(board, home - 1, opp) &&
          !isAttacked(board, home - 2, opp)
        ) {
          add({ from: f, to: home - 2, kind: 'std', castle: [home - 4, home - 1] });
        }
      }
    } else {
      // Pawn (§5): standard + anarch moves. Pawns never emulate (§5.3).
      const r = f >> 3;
      const c = f & 7;
      const rr = r + fwd;
      if (rr >= 0 && rr < 8) {
        const q1 = board[rr * 8 + c];
        if (q1 === 0) {
          addPawn(f, rr * 8 + c, 'std', null); // forward 1
          if (r === startRow) {
            const t2 = (rr + fwd) * 8 + c;
            if (board[t2] === 0) addPawn(f, t2, 'std', { dbl: true }); // double step
          }
        } else if (colorOf(q1) === me && typeOf(q1) !== 6) {
          addPawn(f, rr * 8 + c, 'tramp', null); // trample onto a friendly piece (§5.2)
        }
        for (let dc = -1; dc <= 1; dc += 2) {
          const cc = c + dc;
          if (cc < 0 || cc > 7) continue;
          const t = rr * 8 + cc;
          const q = board[t];
          if (q !== 0 && colorOf(q) === opp) {
            addPawn(f, t, 'std', null); // diagonal capture (may take the King, §7.2)
          } else if (q === 0) {
            if (t === pos.ep) add({ from: f, to: t, kind: 'std', removed: r * 8 + c }); // en passant
            else addPawn(f, t, 'emu', { as: 0 }); // diagonal step (§5.2)
          }
        }
      }
    }

    // Emulation profiles — require a living ally of the emulated type (§3.1/§3.2)
    const emuList = EMULATES[T];
    for (let e = 0; e < emuList.length; e++) {
      const B = emuList[e];
      if (alive[B] === 0) continue;
      genProfile(f, B, 'emu');
    }
  }

  return Array.from(seen.values());
}

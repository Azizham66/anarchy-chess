// Board utilities: piece codec, FEN in/out, square names, Zobrist key tables.

import { BLACK, KING, WHITE } from './types';
import type { Color, Position } from './types';
import { CHAR_OF_TYPE } from './tables';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1';

export function colorOf(p: number): Color {
  return (p >> 3) as Color;
}
export function typeOf(p: number): number {
  return p & 7;
}

// --- Zobrist hashing: two independent 32-bit tables (hash + lock) so TT hits verify on both. ---
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}

const randA = mulberry32(0x5deece6 ^ 0x1234);
const randB = mulberry32(0x2545f49 ^ 0x9e37);

export const Z_PIECE = new Int32Array(15 * 64);
export const L_PIECE = new Int32Array(15 * 64);
for (let i = 0; i < Z_PIECE.length; i++) {
  Z_PIECE[i] = randA() | 0;
  L_PIECE[i] = randB() | 0;
}
export const Z_TURN = randA() | 0;
export const L_TURN = randB() | 0;
export const Z_CASTLE = new Int32Array(16);
export const L_CASTLE = new Int32Array(16);
for (let i = 0; i < 16; i++) {
  Z_CASTLE[i] = randA() | 0;
  L_CASTLE[i] = randB() | 0;
}
export const Z_EP = new Int32Array(8);
export const L_EP = new Int32Array(8);
for (let i = 0; i < 8; i++) {
  Z_EP[i] = randA() | 0;
  L_EP[i] = randB() | 0;
}

export function computeKeys(pos: Position): void {
  let h = 0;
  let l = 0;
  const b = pos.board;
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (p !== 0) {
      h ^= Z_PIECE[p * 64 + i];
      l ^= L_PIECE[p * 64 + i];
    }
  }
  if (pos.turn === BLACK) {
    h ^= Z_TURN;
    l ^= L_TURN;
  }
  h ^= Z_CASTLE[pos.castling];
  l ^= L_CASTLE[pos.castling];
  if (pos.ep >= 0) {
    h ^= Z_EP[pos.ep & 7];
    l ^= L_EP[pos.ep & 7];
  }
  pos.hash = h;
  pos.lock = l;
}

// --- FEN ---
export function posFromFen(fen: string): Position {
  const parts = fen.trim().split(/\s+/);
  const rows = parts[0]?.split('/');
  if (!rows || rows.length !== 8) throw new Error(`bad FEN board: ${fen}`);
  const board = new Int8Array(64);
  let i = 0;
  for (const row of rows) {
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        i += Number(ch);
        continue;
      }
      const t = CHAR_OF_TYPE.indexOf(ch.toUpperCase());
      if (t <= 0) throw new Error(`bad FEN piece: ${ch}`);
      board[i++] = ch === ch.toUpperCase() ? t : t | 8;
    }
  }
  if (i !== 64) throw new Error(`bad FEN square count (${i}): ${fen}`);
  const turn: Color = parts[1] === 'b' ? BLACK : WHITE;
  let castling = 0;
  const cstr = parts[2] ?? '-';
  if (cstr.includes('K')) castling |= 1;
  if (cstr.includes('Q')) castling |= 2;
  if (cstr.includes('k')) castling |= 4;
  if (cstr.includes('q')) castling |= 8;
  const epStr = parts[3] ?? '-';
  const ep = epStr && epStr !== '-' ? sqFromName(epStr) : -1;
  const halfmove = parts[4] ? Number(parts[4]) : 0;
  const kings: [number, number] = [-1, -1];
  for (let s = 0; s < 64; s++) {
    const p = board[s];
    if (p !== 0 && (p & 7) === KING) kings[p >> 3] = s;
  }
  if (kings[0] < 0 || kings[1] < 0) throw new Error('FEN must contain both kings');
  const pos: Position = { board, turn, castling, ep, halfmove, kings, hash: 0, lock: 0 };
  computeKeys(pos);
  return pos;
}

export function fenOf(pos: Position): string {
  let out = '';
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = pos.board[r * 8 + c];
      if (p === 0) {
        empty++;
      } else {
        if (empty) {
          out += empty;
          empty = 0;
        }
        const ch = CHAR_OF_TYPE[p & 7];
        out += p >> 3 === 0 ? ch : ch.toLowerCase();
      }
    }
    if (empty) out += empty;
    if (r < 7) out += '/';
  }
  let cas = '';
  if (pos.castling & 1) cas += 'K';
  if (pos.castling & 2) cas += 'Q';
  if (pos.castling & 4) cas += 'k';
  if (pos.castling & 8) cas += 'q';
  return `${out} ${pos.turn === WHITE ? 'w' : 'b'} ${cas || '-'} ${pos.ep >= 0 ? sqName(pos.ep) : '-'} ${pos.halfmove} 1`;
}

// --- squares ---
export function sqName(i: number): string {
  return 'abcdefgh'[i & 7] + String(8 - (i >> 3));
}
export function sqFromName(s: string): number {
  const c = s.charCodeAt(0) - 97;
  const r = s.charCodeAt(1) - 49;
  if (c < 0 || c > 7 || r < 0 || r > 7) return -1;
  return (7 - r) * 8 + c;
}

export function clonePos(p: Position): Position {
  return {
    board: p.board.slice(),
    turn: p.turn,
    castling: p.castling,
    ep: p.ep,
    halfmove: p.halfmove,
    kings: [p.kings[0], p.kings[1]],
    hash: p.hash,
    lock: p.lock,
  };
}

export function emptyPosition(): Position {
  return posFromFen(START_FEN);
}

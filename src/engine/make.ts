// Make/unmake with incremental Zobrist keys — the search's hot path. Mutates the Position in
// place; unmakeMove restores every field exactly. Handles castling rook hops, en-passant pawn
// removal, friendly-jump destruction, tramples and promotion.

import type { Move, Position, Undo } from './types';
import { Z_CASTLE, Z_EP, Z_PIECE, Z_TURN, L_CASTLE, L_EP, L_PIECE, L_TURN, colorOf, typeOf } from './board';
import { KING, PAWN } from './tables';

export function makeMove(pos: Position, m: Move): Undo {
  const board = pos.board;
  const moved = board[m.from];
  const me = colorOf(moved);
  const T = typeOf(moved);
  const captured = board[m.to];
  const removedSq = m.removed ?? -1;
  const removedPiece = removedSq >= 0 ? board[removedSq] : 0;
  const prevHash = pos.hash;
  const prevLock = pos.lock;
  const prevCastling = pos.castling;
  const prevEp = pos.ep;
  const prevHalfmove = pos.halfmove;

  let h = prevHash;
  let l = prevLock;

  // Key out the pre-move state terms that will change
  if (pos.ep >= 0) {
    h ^= Z_EP[pos.ep & 7];
    l ^= L_EP[pos.ep & 7];
  }
  h ^= Z_CASTLE[pos.castling];
  l ^= L_CASTLE[pos.castling];

  // Move the piece (landing may overwrite the captured piece)
  board[m.to] = moved;
  board[m.from] = 0;
  if (removedSq >= 0) board[removedSq] = 0;

  // Promotion (§8.3)
  let promoPiece = 0;
  if (m.promo && T === PAWN) {
    promoPiece = m.promo | (me << 3);
    board[m.to] = promoPiece;
  }

  // Castling rook hop
  if (m.castle) {
    const rf = m.castle[0];
    const rt = m.castle[1];
    const rook = board[rf];
    board[rt] = rook;
    board[rf] = 0;
    h ^= Z_PIECE[rook * 64 + rf] ^ Z_PIECE[rook * 64 + rt];
    l ^= L_PIECE[rook * 64 + rf] ^ L_PIECE[rook * 64 + rt];
  }

  if (T === KING) pos.kings[me] = m.to;

  // Key in the post-move terms
  h ^= Z_PIECE[moved * 64 + m.from];
  l ^= L_PIECE[moved * 64 + m.from];
  if (promoPiece) {
    h ^= Z_PIECE[promoPiece * 64 + m.to];
    l ^= L_PIECE[promoPiece * 64 + m.to];
  } else {
    h ^= Z_PIECE[moved * 64 + m.to];
    l ^= L_PIECE[moved * 64 + m.to];
  }
  if (captured !== 0) {
    h ^= Z_PIECE[captured * 64 + m.to];
    l ^= L_PIECE[captured * 64 + m.to];
  }
  if (removedPiece !== 0) {
    h ^= Z_PIECE[removedPiece * 64 + removedSq];
    l ^= L_PIECE[removedPiece * 64 + removedSq];
  }
  h ^= Z_TURN;
  l ^= L_TURN;

  // Castling rights (§8.1): lost when the King moves, or when anything moves from/to a Rook's
  // home square — including pieces destroyed there by a jump or trample.
  let cas = pos.castling;
  if (T === KING) cas &= me === 0 ? ~3 : ~12;
  if (m.from === 63 || m.to === 63 || removedSq === 63) cas &= ~1;
  if (m.from === 56 || m.to === 56 || removedSq === 56) cas &= ~2;
  if (m.from === 7 || m.to === 7 || removedSq === 7) cas &= ~4;
  if (m.from === 0 || m.to === 0 || removedSq === 0) cas &= ~8;
  h ^= Z_CASTLE[cas];
  l ^= L_CASTLE[cas];
  pos.castling = cas;

  // En passant square: only a standard double step creates one (§8.2)
  pos.ep = T === PAWN && m.dbl ? (m.from + m.to) >> 1 : -1;
  if (pos.ep >= 0) {
    h ^= Z_EP[pos.ep & 7];
    l ^= L_EP[pos.ep & 7];
  }

  // 50-move counter (§9): reset on pawn move, capture, or friendly-fire destruction
  pos.halfmove = T === PAWN || captured !== 0 || removedPiece !== 0 ? 0 : pos.halfmove + 1;

  pos.turn = (1 - me) as 0 | 1;
  pos.hash = h;
  pos.lock = l;

  return {
    moved,
    captured,
    removedPiece,
    castling: prevCastling,
    ep: prevEp,
    halfmove: prevHalfmove,
    prevHash,
    prevLock,
  };
}

export function unmakeMove(pos: Position, m: Move, u: Undo): void {
  const board = pos.board;
  const me = colorOf(u.moved);
  pos.turn = me;
  board[m.from] = u.moved;
  board[m.to] = u.captured;
  if (m.removed !== undefined && m.removed >= 0) board[m.removed] = u.removedPiece;
  if (m.castle) {
    const rf = m.castle[0];
    const rt = m.castle[1];
    board[rf] = board[rt];
    board[rt] = 0;
  }
  if (typeOf(u.moved) === KING) pos.kings[me] = m.from;
  pos.castling = u.castling;
  pos.ep = u.ep;
  pos.halfmove = u.halfmove;
  pos.hash = u.prevHash;
  pos.lock = u.prevLock;
}

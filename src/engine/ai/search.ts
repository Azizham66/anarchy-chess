// Search: iterative deepening over negamax with alpha-beta, a verified transposition table,
// quiescence (captures only), killer/history ordering and repetition avoidance. The board is
// mutated in place via make/unmake — no per-node allocation beyond small arrays.

import type { Move, Position } from '../types';
import { generateMoves } from '../generate';
import { capturesKing, forcedKingMoves, legalAfterMake, legalCtx, legalMoves } from '../legality';
import { makeMove, unmakeMove } from '../make';
import { isAttacked } from '../attacks';
import { typeOf } from '../board';
import { KING, PIECE_VALUE } from '../tables';
import { evaluateSTM } from './eval';

const MATE = 1_000_000;
const INF = 1e9;
const MAX_PLY = 120;

interface TTEntry {
  depth: number;
  score: number;
  flag: 0 | 1 | 2; // 0 exact, 1 lower bound, 2 upper bound
  move: Move | null;
  lock: number;
}

export interface SearchOptions {
  maxDepth: number;
  timeMs: number;
  /** Centipawns of uniform noise on root scores (weak levels). */
  jitter?: number;
  /** Zobrist hashes of the game's earlier positions — search avoids repeating them. */
  historyHashes?: number[];
}

export interface SearchResult {
  move: Move | null;
  score: number; // side-to-move perspective
  depth: number;
  nodes: number;
}

// Per-think state (module-level: the engine runs in one worker thread / sync call at a time)
const TT = new Map<number, TTEntry>();
const killers = new Int32Array(MAX_PLY * 2).fill(-1);
const historyHeuristic = new Int32Array(64 * 64);
const repStack = new Int32Array(MAX_PLY + 1);
let historyHashes: number[] = [];
let deadline = 0;
let nodes = 0;
let stopped = false;

function timeUp(): boolean {
  if (stopped) return true;
  if ((++nodes & 2047) === 0 && Date.now() > deadline) {
    stopped = true;
    return true;
  }
  return false;
}

function repSeen(hash: number, ply: number): boolean {
  for (let i = 0; i < ply; i++) if (repStack[i] === hash) return true;
  for (let i = 0; i < historyHashes.length; i++) if (historyHashes[i] === hash) return true;
  return false;
}

function orderMoves(pos: Position, moves: Move[], ttMove: Move | null, ply: number): Move[] {
  const board = pos.board;
  const scored = moves.map((m) => {
    const cap = board[m.to];
    let s: number;
    if (cap !== 0 && typeOf(cap) === KING) s = 1e9;
    else if (ttMove !== null && m.from === ttMove.from && m.to === ttMove.to) s = 1e8;
    else if (cap !== 0) s = 1e7 + PIECE_VALUE[typeOf(cap)] * 100 - PIECE_VALUE[typeOf(board[m.from])];
    else if (m.promo) s = 1e7 + PIECE_VALUE[m.promo] * 10;
    else if (killers[ply * 2] === m.from * 64 + m.to || killers[ply * 2 + 1] === m.from * 64 + m.to) s = 1e5;
    else s = historyHeuristic[m.from * 64 + m.to];
    if (m.kind === 'jump' || m.kind === 'tramp') s -= 2000; // destructive moves late, unless forced
    return [s, m] as const;
  });
  scored.sort((a, b) => b[0] - a[0]);
  return scored.map((x) => x[1]);
}

function qsearch(pos: Position, alpha: number, beta: number, ply: number): number {
  if (timeUp()) return 0;
  const stand = evaluateSTM(pos);
  if (stand >= beta) return stand;
  if (stand > alpha) alpha = stand;
  if (ply >= MAX_PLY - 1) return stand;

  const board = pos.board;
  const me = pos.turn;
  const opp = (1 - me) as 0 | 1;
  const myKing = pos.kings[me];

  // Captures only (std kind, occupied target), sharpest first. Pseudo-legal on purpose — the
  // make + isAttacked check below filters self-checks far cheaper than a full legality pass.
  const caps: Move[] = [];
  for (const m of generateMoves(pos)) {
    const q = board[m.to];
    if (q !== 0 && m.kind === 'std') {
      if (typeOf(q) === KING) return MATE - ply; // capturing the King is always legal (§7.2)
      caps.push(m);
    }
  }
  caps.sort(
    (a, b) =>
      PIECE_VALUE[typeOf(board[b.to])] * 100 -
      PIECE_VALUE[typeOf(board[b.from])] -
      (PIECE_VALUE[typeOf(board[a.to])] * 100 - PIECE_VALUE[typeOf(board[a.from])]),
  );

  let best = stand;
  for (const m of caps) {
    const u = makeMove(pos, m);
    // Cheap legality approximation: skip captures that leave our King attacked (§7.1 superset).
    const kingSq = typeOf(u.moved) === KING ? m.to : myKing;
    if (isAttacked(pos.board, kingSq, opp)) {
      unmakeMove(pos, m, u);
      continue;
    }
    const v = -qsearch(pos, -beta, -alpha, ply + 1);
    unmakeMove(pos, m, u);
    if (stopped) return 0;
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

const NULL_KEY = 0x2f6b9e41;

function hasPieces(pos: Position): boolean {
  const b = pos.board;
  const me = pos.turn;
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (p !== 0 && p >> 3 === me) {
      const t = p & 7;
      if (t !== 1 && t !== 6) return true;
    }
  }
  return false;
}

function negamax(pos: Position, depth: number, alpha: number, beta: number, ply: number, allowNull: boolean): number {
  if (timeUp()) return 0;
  if (ply >= MAX_PLY - 1) return evaluateSTM(pos);

  // Repetition (§9) — treat as a draw the search is happy to reach but not to seek blindly.
  if (ply > 0 && repSeen(pos.hash, ply)) return 0;
  repStack[ply] = pos.hash;

  if (depth <= 0) return qsearch(pos, alpha, beta, ply);

  const key = pos.hash;
  const tt = TT.get(key);
  let ttMove: Move | null = null;
  if (tt !== undefined && tt.lock === pos.lock) {
    ttMove = tt.move;
    if (tt.depth >= depth) {
      if (tt.flag === 0) return tt.score;
      if (tt.flag === 1 && tt.score >= beta) return tt.score;
      if (tt.flag === 2 && tt.score <= alpha) return tt.score;
    }
  }

  const x0InCheck = isAttacked(pos.board, pos.kings[pos.turn], (1 - pos.turn) as 0 | 1);

  // Null-move pruning: if passing still fails high, this node is too good to need a full search.
  // Disabled in check and in pawn-only endgames (zugzwang), and never at the root.
  if (allowNull && depth >= 3 && ply > 0 && !x0InCheck && beta < MATE - MAX_PLY && hasPieces(pos)) {
    const ep = pos.ep;
    const h = pos.hash;
    pos.turn = (1 - pos.turn) as 0 | 1;
    pos.ep = -1;
    pos.hash = h ^ NULL_KEY;
    const v = -negamax(pos, depth - 3, -beta, -beta + 1, ply + 1, false);
    pos.turn = (1 - pos.turn) as 0 | 1;
    pos.ep = ep;
    pos.hash = h;
    if (stopped) return 0;
    if (v >= beta) return beta;
  }

  // Lazy legality: order pseudo moves, verify each only when visited — cutoffs skip the rest.
  const pseudo = generateMoves(pos);
  const x = legalCtx(pos);
  let ordered = orderMoves(pos, pseudo, ttMove, ply);
  const alpha0 = alpha;
  let best = -INF;
  let bestMove: Move | null = null;
  let any = false;
  let moveIdx = 0;

  for (let pass = 0; pass < 2; pass++) {
    for (const m of ordered) {
      if (capturesKing(pos, m)) {
        best = MATE - ply; // capturing the King ends the game (§7.2)
        bestMove = m;
        any = true;
        break;
      }
      const u = makeMove(pos, m);
      // pass 1 = §7.4 forced King moves: legal even into attack
      if (pass === 0 && !legalAfterMake(pos, m, typeOf(u.moved) === KING, x)) {
        unmakeMove(pos, m, u);
        continue;
      }
      const first = !any;
      any = true;
      moveIdx++;
      let v: number;
      if (first) {
        v = -negamax(pos, depth - 1, -beta, -alpha, ply + 1, true);
      } else {
        // PVS + late-move reductions for quiet, non-forcing moves
        const quiet = u.captured === 0 && !m.promo && m.kind !== 'tramp';
        const r = quiet && depth >= 3 && moveIdx > 3 && !x0InCheck ? (moveIdx > 10 ? 2 : 1) : 0;
        v = -negamax(pos, depth - 1 - r, -alpha - 1, -alpha, ply + 1, true);
        if (!stopped && v > alpha && (r > 0 || v < beta)) v = -negamax(pos, depth - 1, -beta, -alpha, ply + 1, true);
      }
      unmakeMove(pos, m, u);
      if (stopped) return 0;
      if (v > best) {
        best = v;
        bestMove = m;
      }
      if (best > alpha) alpha = best;
      if (alpha >= beta) {
        if (pos.board[m.to] === 0 && m.kind === 'std') {
          const kIdx = ply * 2;
          if (killers[kIdx] !== m.from * 64 + m.to) {
            killers[kIdx + 1] = killers[kIdx];
            killers[kIdx] = m.from * 64 + m.to;
          }
          historyHeuristic[m.from * 64 + m.to] += depth * depth;
        }
        break;
      }
    }
    if (any || !x.selfInCheck) break;
    ordered = forcedKingMoves(ordered, x.myKing);
  }
  if (!any) return 0; // stalemate draw (§7.3 / §7.4 with no King step)

  TT.set(key, {
    depth,
    score: best,
    flag: best <= alpha0 ? 2 : best >= beta ? 1 : 0,
    move: bestMove,
    lock: pos.lock,
  });
  return best;
}

/** Root search with iterative deepening; returns the best move (or null on stalemate). */
export function searchBestMove(pos: Position, opts: SearchOptions): SearchResult {
  TT.clear();
  killers.fill(-1);
  historyHeuristic.fill(0);
  historyHashes = opts.historyHashes ?? [];
  nodes = 0;
  stopped = false;
  deadline = Date.now() + opts.timeMs;
  repStack[0] = pos.hash;
  const jitter = opts.jitter ?? 0;

  let rootBest: Move | null = null;
  let rootScore = 0;
  let reached = 0;

  for (let d = 1; d <= opts.maxDepth; d++) {
    const { moves } = legalMoves(pos);
    if (moves.length === 0) {
      rootBest = null;
      break;
    }
    const ordered = orderMoves(pos, moves, rootBest, 0);
    // Root window is widened by `jitter` so every move the noise could promote gets an EXACT score;
    // fail-low moves only return upper bounds and must never be chosen (noise on a bound = blunder).
    let rawBest = -INF;
    let best = -INF;
    let bestM: Move | null = null;
    for (const m of ordered) {
      const cap = pos.board[m.to];
      let raw: number;
      if (cap !== 0 && typeOf(cap) === KING) {
        raw = MATE; // capture the King and win immediately
      } else {
        const floor = rawBest === -INF ? -INF : rawBest - jitter;
        const u = makeMove(pos, m);
        raw = -negamax(pos, d - 1, -INF, -floor, 1, true);
        unmakeMove(pos, m, u);
        if (stopped) break;
        if (raw <= floor) continue; // fail-low: only a bound, provably not among the candidates
      }
      if (raw > rawBest) rawBest = raw;
      const noisy = jitter > 0 && Math.abs(raw) < MATE - MAX_PLY ? raw + (Math.random() - 0.5) * jitter : raw;
      if (noisy > best) {
        best = noisy;
        bestM = m;
      }
    }
    if (!stopped && bestM !== null) best = rawBest;
    if (stopped) break; // partial iteration — keep the previous depth's choice
    rootBest = bestM;
    rootScore = best;
    reached = d;
    if (best >= MATE - MAX_PLY || best <= -MATE + MAX_PLY) break; // forced win/loss found
  }

  return { move: rootBest, score: rootScore, depth: reached, nodes };
}

// Game controller: owns the move history, drives the AI worker, plays sounds, saves finished
// matches and runs post-game analysis. Components stay dumb — they read state and call actions.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  DEFAULT_LEVEL,
  KING,
  START_FEN,
  applyMoveCopy,
  colorOf,
  fenOf,
  gameOutcome,
  inCheck,
  legalMoves,
  moveToNotation,
  posFromFen,
  positionKey,
  typeOf,
} from '@/engine';
import type { Color, Move, Outcome, Position } from '@/engine';
import { EngineClient } from '@/lib/engineClient';
import { saveMatch } from '@/lib/matches';
import { playSound } from '@/lib/sound';
import type { GameMode, MatchCreate } from '@/lib/types';

/** Promotion choices offered to humans (rulebook §8.3 — the AI auto-queens). */
const PROMOS = [5, 4, 3, 2];

export interface MoveEffect {
  captured: number; // piece byte taken on the target square (enemy, or friendly on a trample)
  destroyed: number; // piece byte removed elsewhere (friendly jump victim / en-passant pawn)
}

export interface GameState {
  id: number;
  mode: GameMode;
  startFen: string;
  positions: Position[];
  moves: Move[];
  notations: string[];
  effects: MoveEffect[];
  keys: string[];
  legal: Move[];
  forced: boolean;
  outcome: Outcome | null;
  startedAt: number;
  caption: string | null;
}

export interface AnalysisState {
  evals: (number | null)[];
  best: string[];
  done: boolean;
}

let gameSeq = 1;

function initGame(mode: GameMode, fen: string, caption: string | null = null): GameState {
  const pos = posFromFen(fen);
  const lm = legalMoves(pos, PROMOS);
  return {
    id: gameSeq++,
    mode,
    startFen: fen,
    positions: [pos],
    moves: [],
    notations: [],
    effects: [],
    keys: [positionKey(pos)],
    legal: lm.moves,
    forced: lm.forced,
    outcome: null,
    startedAt: Date.now(),
    caption,
  };
}

const humanColor = (mode: GameMode): Color | null => (mode === 'ai_white' ? 0 : mode === 'ai_black' ? 1 : null);

function soundFor(next: GameState, m: Move, eff: MoveEffect): Parameters<typeof playSound>[0] {
  if (next.outcome) {
    const hc = humanColor(next.mode);
    if (next.outcome.winner === null) return 'draw';
    if (hc === null) return 'win';
    return next.outcome.winner === hc ? 'win' : 'lose';
  }
  const cur = next.positions[next.positions.length - 1];
  if (inCheck(cur, cur.turn)) return 'check';
  if (m.kind === 'jump') return 'jump';
  if (m.kind === 'tramp') return 'trample';
  if (m.kind === 'emu') return eff.captured ? 'capture' : 'emu';
  return eff.captured || eff.destroyed ? 'capture' : 'move';
}

export function useAnarchGame() {
  const queryClient = useQueryClient();
  const [game, setGame] = useState<GameState>(() => initGame('ai_white', START_FEN));
  const [level, setLevel] = useState<number>(DEFAULT_LEVEL);
  const [selected, setSelected] = useState<number | null>(null);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [thinking, setThinking] = useState(false);
  const [aiInfo, setAiInfo] = useState<{ depth: number; nodes: number } | null>(null);
  const [liveEval, setLiveEval] = useState<{ cp: number; depth: number } | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [promoChoice, setPromoChoice] = useState<Move[] | null>(null);
  const [manualFlip, setManualFlip] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'offline'>('idle');

  const playClient = useRef<EngineClient | null>(null);
  const evalClient = useRef<EngineClient | null>(null);
  const savedFor = useRef<number>(0);

  useEffect(() => {
    playClient.current = new EngineClient();
    evalClient.current = new EngineClient();
    return () => {
      playClient.current?.dispose();
      evalClient.current?.dispose();
      playClient.current = null;
      evalClient.current = null;
    };
  }, []);

  const current = game.positions[game.positions.length - 1];
  const hc = humanColor(game.mode);
  const aiTurn = !game.outcome && hc !== null && current.turn !== hc;

  // --- apply a move (human or AI) ---
  const applyMove = useCallback((m: Move) => {
    setGame((g) => {
      if (g.outcome) return g;
      const pos = g.positions[g.positions.length - 1];
      const target = pos.board[m.to];
      const kingCaptured: Color | null = target !== 0 && typeOf(target) === KING ? colorOf(target) : null;
      const notation = moveToNotation(pos, m);
      const { pos: next, captured, destroyed } = applyMoveCopy(pos, m);
      const lm = kingCaptured !== null ? { moves: [], forced: false } : legalMoves(next, PROMOS);
      const outcome = gameOutcome(next, lm.moves, g.keys, kingCaptured);
      const eff = { captured, destroyed };
      const ng: GameState = {
        ...g,
        positions: [...g.positions, next],
        moves: [...g.moves, m],
        notations: [...g.notations, notation],
        effects: [...g.effects, eff],
        keys: [...g.keys, positionKey(next)],
        legal: outcome ? [] : lm.moves,
        forced: lm.forced,
        outcome,
      };
      queueMicrotask(() => playSound(soundFor(ng, m, eff)));
      return ng;
    });
    setSelected(null);
    setViewIndex(null);
    setPromoChoice(null);
  }, []);

  // --- AI turn ---
  useEffect(() => {
    if (!aiTurn) return;
    const client = playClient.current;
    if (!client) return;
    let cancelled = false;
    let settled = false;
    setThinking(true);
    const t0 = Date.now();
    const hashes = game.positions.slice(0, -1).map((p) => p.hash);
    const legalNow = game.legal;
    void client.bestMove(current, level, hashes).then((r) => {
      settled = true;
      if (cancelled) return;
      const wait = Math.max(0, 420 - (Date.now() - t0)); // small pause so instant replies feel natural
      setTimeout(() => {
        if (cancelled) return;
        setThinking(false);
        setAiInfo({ depth: r.depth, nodes: r.nodes });
        const chosen = r.move ? legalNow.find((x) => x.from === r.move!.from && x.to === r.move!.to && (x.promo ?? 0) === (r.move!.promo ?? 0)) : undefined;
        const m = chosen ?? legalNow[0];
        if (m) applyMove(m);
      }, wait);
    });
    return () => {
      cancelled = true;
      setThinking(false);
      if (!settled) client.reset(); // abort an in-flight search (undo / new game / mode change)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiTurn, game.id, game.positions.length]);

  // --- live eval bar (quick search on the eval worker) ---
  useEffect(() => {
    if (game.outcome) return;
    const client = evalClient.current;
    if (!client) return;
    let cancelled = false;
    const t = setTimeout(() => {
      void client.evaluate(current, 350).then((r) => {
        if (!cancelled) setLiveEval({ cp: r.evalCp, depth: r.depth });
      });
    }, 60);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id, game.positions.length, game.outcome]);

  // --- game over: save + analyse ---
  useEffect(() => {
    if (!game.outcome || savedFor.current === game.id) return;
    savedFor.current = game.id;
    const o = game.outcome;
    const last = game.positions[game.positions.length - 1];

    if (game.mode !== 'showcase') {
      const body: MatchCreate = {
        mode: game.mode,
        ai_level: humanColor(game.mode) !== null ? level : null,
        winner: o.winner === null ? null : o.winner === 0 ? 'white' : 'black',
        reason: o.reason,
        plies: game.moves.length,
        moves: game.notations,
        start_fen: game.startFen,
        final_fen: fenOf(last),
        duration_s: Math.round((Date.now() - game.startedAt) / 1000),
      };
      void saveMatch(body).then(({ offline }) => {
        setSaveState(offline ? 'offline' : 'saved');
        void queryClient.invalidateQueries({ queryKey: ['matches'] });
        void queryClient.invalidateQueries({ queryKey: ['stats'] });
        toast(offline ? 'Match saved on this device' : 'Match saved to archive', {
          description: offline ? 'The server is unreachable — kept in local storage.' : `${game.moves.length} plies recorded.`,
        });
      });
    }

    const client = evalClient.current;
    if (!client) return;
    client.reset();
    const n = game.positions.length;
    const final = o.winner === null ? 0 : o.winner === 0 ? 2000 : -2000;
    setAnalysis({ evals: Array<number | null>(n).fill(null), best: Array<string>(n).fill(''), done: false });
    // The final position is decided by the outcome; analyse everything before it.
    client.analyze(
      game.positions.slice(0, -1),
      (i, cp, best) =>
        setAnalysis((a) => {
          if (!a) return a;
          const evals = a.evals.slice();
          const bests = a.best.slice();
          evals[i] = cp;
          bests[i] = best;
          evals[n - 1] = final;
          return { ...a, evals, best: bests };
        }),
      () => setAnalysis((a) => (a ? { ...a, done: true, evals: a.evals.map((e, i) => (i === n - 1 ? final : e)) } : a)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.outcome, game.id]);

  // --- actions ---
  const newGame = useCallback((mode?: GameMode, fen?: string, caption?: string | null) => {
    evalClient.current?.reset();
    setGame((g) => initGame(mode ?? (g.mode === 'showcase' ? 'ai_white' : g.mode), fen ?? START_FEN, caption ?? null));
    setSelected(null);
    setViewIndex(null);
    setAnalysis(null);
    setAiInfo(null);
    setLiveEval(null);
    setPromoChoice(null);
    setSaveState('idle');
    playSound('click');
  }, []);

  const undo = useCallback(() => {
    setGame((g) => {
      if (g.moves.length === 0) return g;
      const h = humanColor(g.mode);
      let n = g.positions.length - 1; // index of the position to return to
      // In AI modes step back to the human's turn (skipping the AI reply).
      while (h !== null && n > 0 && g.positions[n].turn !== h) n--;
      if (n === g.positions.length - 1) n--; // always undo at least one ply
      if (h !== null) while (n > 0 && g.positions[n].turn !== h) n--;
      if (n < 0) return g;
      const pos = g.positions[n];
      const lm = legalMoves(pos, PROMOS);
      return {
        ...g,
        positions: g.positions.slice(0, n + 1),
        moves: g.moves.slice(0, n),
        notations: g.notations.slice(0, n),
        effects: g.effects.slice(0, n),
        keys: g.keys.slice(0, n + 1),
        legal: lm.moves,
        forced: lm.forced,
        outcome: null,
      };
    });
    savedFor.current = 0;
    evalClient.current?.reset();
    setAnalysis(null);
    setSelected(null);
    setViewIndex(null);
    setPromoChoice(null);
    setSaveState('idle');
    playSound('click');
  }, []);

  const canInteract = !game.outcome && !thinking && viewIndex === null && (hc === null || current.turn === hc);

  const clickSquare = useCallback(
    (sq: number) => {
      if (!canInteract) return;
      if (selected !== null) {
        const cands = game.legal.filter((m) => m.from === selected && m.to === sq);
        if (cands.length > 1) {
          setPromoChoice(cands);
          return;
        }
        if (cands.length === 1) {
          applyMove(cands[0]);
          return;
        }
      }
      const p = current.board[sq];
      if (p !== 0 && colorOf(p) === current.turn && sq !== selected) {
        setSelected(sq);
        playSound('click');
      } else {
        setSelected(null);
      }
    },
    [canInteract, selected, game.legal, current, applyMove],
  );

  const review = useCallback(
    (i: number | null) => {
      if (i === null || i >= game.positions.length - 1) setViewIndex(null);
      else setViewIndex(Math.max(0, i));
      setSelected(null);
    },
    [game.positions.length],
  );

  const shownIndex = viewIndex ?? game.positions.length - 1;
  const shown = game.positions[shownIndex];
  const lastMove = shownIndex > 0 ? game.moves[shownIndex - 1] : null;
  const lastEffect = shownIndex > 0 ? game.effects[shownIndex - 1] : null;

  const targets = useMemo(() => {
    const map = new Map<number, Move>();
    if (selected === null || viewIndex !== null) return map;
    for (const m of game.legal) if (m.from === selected && !map.has(m.to)) map.set(m.to, m);
    return map;
  }, [selected, game.legal, viewIndex]);

  // White-perspective eval shown on the bar
  const evalCp = useMemo(() => {
    if (analysis && analysis.evals[shownIndex] != null) return analysis.evals[shownIndex] as number;
    if (game.outcome) return game.outcome.winner === null ? 0 : game.outcome.winner === 0 ? 2000 : -2000;
    return liveEval?.cp ?? 0;
  }, [analysis, shownIndex, game.outcome, liveEval]);

  const flipped = (game.mode === 'ai_black') !== manualFlip;

  return {
    game,
    current,
    shown,
    shownIndex,
    lastMove,
    lastEffect,
    level,
    setLevel,
    selected,
    targets,
    thinking,
    aiTurn,
    aiInfo,
    evalCp,
    evalDepth: liveEval?.depth ?? null,
    analysis,
    promoChoice,
    setPromoChoice,
    applyMove,
    flipped,
    toggleFlip: () => setManualFlip((f) => !f),
    viewIndex,
    review,
    canInteract,
    clickSquare,
    newGame,
    undo,
    saveState,
  };
}

export type AnarchGame = ReturnType<typeof useAnarchGame>;

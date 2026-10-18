// Thin promise/callback wrapper over the engine Web Worker. Two instances: one plays moves,
// one evaluates/analyses — so a long post-game analysis never stalls the AI's reply.
// Falls back to running the engine on the main thread if Workers are unavailable.

import { LEVELS, deserializePos, moveToNotation, searchBestMove, serializePos } from '@/engine';
import type { Move, Position } from '@/engine';
import type { WorkerRequest, WorkerResponse } from '@/engine/ai/worker';

type Listener = (r: WorkerResponse) => void;

export interface BestMoveResult {
  move: Move | null;
  score: number;
  depth: number;
  nodes: number;
}

// Helper: a sync stand-in implementing the worker protocol on the main thread.
function runSync(req: WorkerRequest, emit: Listener): void {
  if (req.type === 'bestmove') {
    const pos = deserializePos(req.pos);
    const lv = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, req.level))];
    const r = searchBestMove(pos, { maxDepth: lv.depth, timeMs: Math.min(lv.timeMs, 1500), jitter: lv.jitter, historyHashes: req.historyHashes });
    emit({ id: req.id, type: 'bestmove', move: r.move, score: r.score, depth: r.depth, nodes: r.nodes });
  } else if (req.type === 'eval') {
    const pos = deserializePos(req.pos);
    const r = searchBestMove(pos, { maxDepth: 4, timeMs: Math.min(req.timeMs, 200) });
    emit({ id: req.id, type: 'eval', evalCp: pos.turn === 0 ? r.score : -r.score, depth: r.depth });
  } else {
    req.positions.forEach((sp, i) => {
      const pos = deserializePos(sp);
      const r = searchBestMove(pos, { maxDepth: 3, timeMs: 80 });
      emit({
        id: req.id,
        type: 'analyze-progress',
        index: i,
        total: req.positions.length,
        evalCp: Math.max(-2000, Math.min(2000, pos.turn === 0 ? r.score : -r.score)),
        best: r.move ? moveToNotation(pos, r.move) : '',
      });
    });
    emit({ id: req.id, type: 'analyze-done' });
  }
}

export class EngineClient {
  private worker: Worker | null = null;
  private listeners = new Map<number, Listener>();
  private nextId = 1;

  constructor() {
    try {
      this.worker = new Worker(new URL('../engine/ai/worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => this.listeners.get(e.data.id)?.(e.data);
      this.worker.onerror = () => {
        this.worker?.terminate();
        this.worker = null;
      };
    } catch {
      this.worker = null;
    }
  }

  private send(req: WorkerRequest, onMsg: Listener): void {
    this.listeners.set(req.id, onMsg);
    if (this.worker) this.worker.postMessage(req);
    else setTimeout(() => runSync(req, onMsg), 30);
  }

  /** Cancels all pending callbacks (responses for them are dropped). Restarting the worker also aborts its search. */
  reset(): void {
    this.listeners.clear();
    if (this.worker) {
      this.worker.terminate();
      try {
        this.worker = new Worker(new URL('../engine/ai/worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => this.listeners.get(e.data.id)?.(e.data);
      } catch {
        this.worker = null;
      }
    }
  }

  bestMove(pos: Position, level: number, historyHashes: number[]): Promise<BestMoveResult> {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.send({ id, type: 'bestmove', pos: serializePos(pos), level, historyHashes }, (r) => {
        if (r.type !== 'bestmove') return;
        this.listeners.delete(id);
        resolve({ move: r.move as Move | null, score: r.score, depth: r.depth, nodes: r.nodes });
      });
    });
  }

  evaluate(pos: Position, timeMs: number): Promise<{ evalCp: number; depth: number }> {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.send({ id, type: 'eval', pos: serializePos(pos), timeMs }, (r) => {
        if (r.type !== 'eval') return;
        this.listeners.delete(id);
        resolve({ evalCp: r.evalCp, depth: r.depth });
      });
    });
  }

  analyze(
    positions: Position[],
    onProgress: (index: number, evalCp: number, best: string) => void,
    onDone: () => void,
  ): void {
    const id = this.nextId++;
    this.send({ id, type: 'analyze', positions: positions.map(serializePos) }, (r) => {
      if (r.type === 'analyze-progress') onProgress(r.index, r.evalCp, r.best);
      else if (r.type === 'analyze-done') {
        this.listeners.delete(id);
        onDone();
      }
    });
  }

  dispose(): void {
    this.listeners.clear();
    this.worker?.terminate();
    this.worker = null;
  }
}

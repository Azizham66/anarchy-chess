// Anarch Chess engine — public surface. Pure module: state in, legal moves out;
// state in plus move out (rulebook §11). The UI, the AI and the tests all share it.

export type { Color, Move, MoveKind, Outcome, OutcomeReason, Position, Undo } from './types';
export { BLACK, WHITE, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, MOVE_KIND_PRIORITY } from './types';
export {
  START_FEN,
  posFromFen,
  fenOf,
  clonePos,
  sqName,
  sqFromName,
  colorOf,
  typeOf,
} from './board';
export { generateMoves } from './generate';
export { makeMove, unmakeMove } from './make';
export { legalMoves, inCheck } from './legality';
export type { LegalResult } from './legality';
export {
  applyMoveCopy,
  gameOutcome,
  isDeadPosition,
  moveToNotation,
  positionKey,
  livingAllies,
  checkGivers,
  serializePos,
  deserializePos,
} from './game';
export type { SerializedPosition } from './game';
export { evaluate, evaluateSTM } from './ai/eval';
export { searchBestMove } from './ai/search';
export type { SearchOptions, SearchResult } from './ai/search';
export { LEVELS, DEFAULT_LEVEL } from './ai/levels';
export type { AiLevel } from './ai/levels';
export { TYPE_NAME, PIECE_VALUE } from './tables';

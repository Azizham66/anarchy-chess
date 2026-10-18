export type { Color, Move, MoveKind, Outcome, Position, Undo } from "../engine/types";

export type GameMode = "ai_white" | "ai_black" | "hotseat" | "showcase";

export interface MatchCreate {
  mode: GameMode;
  ai_level: number | null;
  reason: string;
  plies: number;
  moves: string[];
  start_fen: string;
  winner: "white" | "black" | null;
  final_fen: string;
  duration_s: number;
}

export interface Match extends MatchCreate {
  id: string;
  created_at: string;
}

export type MatchSummary = Match;

export interface Stats {
  total: number;
  white_wins: number;
  black_wins: number;
  draws: number;
  vs_ai_wins: number;
  vs_ai_losses: number;
  vs_ai_draws: number;
  avg_plies: number;
}

// Match archive client: backend first, localStorage fallback so the game never depends on the API.

import { apiGet, apiPost } from '@/lib/api';
import type { Match, MatchCreate, MatchSummary, Stats } from '@/lib/types';

const LOCAL_KEY = 'anarch-local-matches';

function readLocal(): Match[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Match[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: Match[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    /* storage full / disabled — nothing else to do */
  }
}

export function saveLocalMatch(body: MatchCreate): Match {
  const m: Match = { ...body, id: `local-${Date.now()}`, created_at: new Date().toISOString() };
  writeLocal([m, ...readLocal()]);
  return m;
}

export function localMatches(): MatchSummary[] {
  return readLocal();
}

export function localStats(): Stats {
  const list = readLocal();
  const vsAi = list.filter((m) => m.mode === 'ai_white' || m.mode === 'ai_black');
  const human = (m: Match) => (m.mode === 'ai_white' ? 'white' : 'black');
  return {
    total: list.length,
    white_wins: list.filter((m) => m.winner === 'white').length,
    black_wins: list.filter((m) => m.winner === 'black').length,
    draws: list.filter((m) => m.winner === null).length,
    vs_ai_wins: vsAi.filter((m) => m.winner === human(m)).length,
    vs_ai_losses: vsAi.filter((m) => m.winner !== null && m.winner !== human(m)).length,
    vs_ai_draws: vsAi.filter((m) => m.winner === null).length,
    avg_plies: list.length ? Math.round((list.reduce((a, m) => a + m.plies, 0) / list.length) * 10) / 10 : 0,
  };
}

/** Save to the backend; on any failure keep the game locally so nothing is lost. */
export async function saveMatch(body: MatchCreate): Promise<{ match: Match; offline: boolean }> {
  try {
    return { match: await apiPost<Match>('/matches', body), offline: false };
  } catch {
    return { match: saveLocalMatch(body), offline: true };
  }
}

export const fetchMatches = () => apiGet<MatchSummary[]>('/matches?limit=20');
export const fetchStats = () => apiGet<Stats>('/stats');
export const fetchMatch = (id: string) => apiGet<Match>(`/matches/${id}`);

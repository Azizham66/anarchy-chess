import { useQuery } from '@tanstack/react-query';
import { CloudOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fetchMatches, fetchStats, localMatches, localStats } from '@/lib/matches';
import type { MatchSummary, Stats } from '@/lib/types';
import { REASON_TEXT } from './pieces';

const MODE_SHORT: Record<string, string> = { ai_white: 'vs AI (W)', ai_black: 'vs AI (B)', hotseat: 'Hotseat', showcase: 'Showcase' };

function resultLabel(m: MatchSummary): string {
  if (m.winner === null) return 'Draw';
  return m.winner === 'white' ? '1–0' : '0–1';
}

export function MatchArchive() {
  const matchesQ = useQuery({ queryKey: ['matches'], queryFn: fetchMatches, retry: 1 });
  const statsQ = useQuery({ queryKey: ['stats'], queryFn: fetchStats, retry: 1 });

  // Gate on the error state — react-query keeps stale data through a failed refetch.
  const offline = matchesQ.isError || statsQ.isError;
  const matches: MatchSummary[] = offline ? localMatches() : (matchesQ.data ?? []);
  const stats: Stats | undefined = offline ? localStats() : statsQ.data;

  const tiles: [string, number | string, string][] = stats
    ? [
        ['Games', stats.total, 'stat-total'],
        ['AI wins', stats.vs_ai_wins, 'stat-vs-ai-wins'],
        ['AI losses', stats.vs_ai_losses, 'stat-vs-ai-losses'],
        ['Draws', stats.draws, 'stat-draws'],
      ]
    : [];

  return (
    <div className="space-y-3" data-testid="match-archive">
      {offline && (
        <Badge variant="outline" data-testid="archive-offline-chip" className="gap-1.5">
          <CloudOff className="size-3" /> Offline mode · local storage
        </Badge>
      )}
      <div className="grid grid-cols-4 gap-2" data-testid="archive-stats">
        {stats
          ? tiles.map(([label, v, id]) => (
              <div key={id} className="rounded-xl border border-border bg-panel px-2 py-2 text-center">
                <p data-testid={id} className="font-mono text-lg font-bold">{v}</p>
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
              </div>
            ))
          : [0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}
      </div>
      {stats && stats.total > 0 && (
        <p className="text-xs text-muted-foreground" data-testid="archive-summary">
          White {stats.white_wins} · Black {stats.black_wins} · avg {stats.avg_plies} plies
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-border" data-testid="match-archive-table">
        {matches.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground" data-testid="archive-empty">
            {matchesQ.isLoading ? 'Loading matches…' : 'No finished games yet — your results land here.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {matches.map((m) => (
              <li key={m.id} data-testid={`archive-row-${m.id}`} className="flex items-center gap-3 bg-panel px-3 py-2.5 text-sm">
                <span className="w-12 font-mono font-bold" data-testid="archive-row-result">{resultLabel(m)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{MODE_SHORT[m.mode]}{m.ai_level != null ? ` · L${m.ai_level + 1}` : ''}</span>
                  <span className="block truncate text-xs text-muted-foreground">{REASON_TEXT[m.reason]} · {m.plies} plies · {Math.floor(m.duration_s / 60)}m {m.duration_s % 60}s</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

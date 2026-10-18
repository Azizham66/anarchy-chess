import { FlipVertical2, Plus, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LEVELS } from '@/engine';
import type { AnarchGame } from '@/hooks/useAnarchGame';
import type { GameMode } from '@/lib/types';

const MODE_LABEL: Record<string, string> = {
  ai_white: 'You: White vs AI',
  ai_black: 'You: Black vs AI',
  hotseat: 'Two players (hotseat)',
  showcase: 'Rule showcase',
};

export function GameControls({ g }: { g: AnarchGame }) {
  const { game, level, setLevel, newGame, undo, toggleFlip, thinking } = g;
  const isAi = game.mode === 'ai_white' || game.mode === 'ai_black';
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-md" data-testid="game-controls">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Game</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select value={game.mode} onValueChange={(v: string) => newGame(v as GameMode)}>
          <SelectTrigger className="w-full" data-testid="game-mode-select">
            <SelectValue>{(v) => MODE_LABEL[v as string]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ai_white" data-testid="mode-option-ai-white">You: White vs AI</SelectItem>
            <SelectItem value="ai_black" data-testid="mode-option-ai-black">You: Black vs AI</SelectItem>
            <SelectItem value="hotseat" data-testid="mode-option-hotseat">Two players (hotseat)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(level)} onValueChange={(v: string) => setLevel(Number(v))} disabled={!isAi}>
          <SelectTrigger className="w-full" data-testid="ai-level-select">
            <SelectValue>{(v) => `AI: ${LEVELS[Number(v)]?.name ?? ''}`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {LEVELS.map((lv, i) => (
              <SelectItem key={lv.name} value={String(i)} data-testid={`ai-level-option-${i}`}>
                {lv.name} <span className="ml-1 font-mono text-xs text-muted-foreground">d{lv.depth} · {lv.timeMs / 1000}s</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button data-testid="new-game-button" onClick={() => newGame()} className="active:scale-[0.98] transition-transform duration-75">
          <Plus className="size-4" /> New game
        </Button>
        <Button
          data-testid="undo-button"
          variant="secondary"
          onClick={undo}
          disabled={game.moves.length === 0 || (thinking && game.moves.length < 1)}
          className="active:scale-[0.98] transition-transform duration-75"
        >
          <Undo2 className="size-4" /> Undo
        </Button>
        <Button data-testid="flip-board-button" variant="outline" onClick={toggleFlip} className="active:scale-[0.98] transition-transform duration-75">
          <FlipVertical2 className="size-4" /> Flip
        </Button>
      </div>
      {game.caption && (
        <p data-testid="showcase-caption" className="mt-3 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-foreground/90">
          {game.caption}
        </p>
      )}
    </div>
  );
}

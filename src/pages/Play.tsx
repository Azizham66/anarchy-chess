import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Chessboard } from '@/components/game/Chessboard';
import { CheatSheet } from '@/components/game/CheatSheet';
import { EvalBar } from '@/components/game/EvalBar';
import { GameControls } from '@/components/game/GameControls';
import { GameStatusCard } from '@/components/game/GameStatusCard';
import { MatchArchive } from '@/components/game/MatchArchive';
import { PostGameAnalysis } from '@/components/game/PostGameAnalysis';
import { PromotionDialog } from '@/components/game/PromotionDialog';
import { RuleShowcases } from '@/components/game/RuleShowcases';
import { KIND_META } from '@/components/game/pieces';
import type { KindKey } from '@/components/game/pieces';
import { useAnarchGame } from '@/hooks/useAnarchGame';
import { classify } from '@/components/game/verdict';

export default function Play() {
  const g = useAnarchGame();
  const i = g.shownIndex;
  const verdict =
    g.analysis && i > 0
      ? classify(g.analysis.evals, i, g.game.positions[i - 1].turn === 0, g.game.notations[i - 1], g.analysis.best[i - 1])
      : null;

  return (
    <>
      {/* Mobile order: board → controls → status → tabs. Desktop: board left, deck right. */}
      <main className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-4 px-3 py-3 sm:px-6 sm:py-6 lg:grid-cols-12 lg:grid-rows-[auto_auto_auto_1fr] lg:gap-x-8 lg:gap-y-4 lg:px-8">
        {/* Board column */}
        <section className="flex flex-col items-center gap-3 lg:col-span-7 lg:row-span-4 lg:row-start-1">
          <div className="flex w-full max-w-[600px] items-stretch gap-2 sm:gap-3">
            <EvalBar evalCp={g.evalCp} depth={g.evalDepth} flipped={g.flipped} />
            <div className="min-w-0 flex-1">
              <Chessboard
                pos={g.shown}
                flipped={g.flipped}
                selected={g.selected}
                targets={g.targets}
                lastMove={g.lastMove}
                lastEffect={g.lastEffect}
                moveKey={g.shownIndex}
                interactive={g.canInteract}
                verdict={verdict}
                onSquare={g.clickSquare}
              />
            </div>
          </div>
          <div className="flex w-full max-w-[600px] flex-wrap gap-x-4 gap-y-1 pl-6 text-xs text-muted-foreground" data-testid="board-legend">
            {(Object.keys(KIND_META) as KindKey[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: KIND_META[k].color }} />
                {KIND_META[k].label}
              </span>
            ))}
          </div>
          <div className="w-full max-w-[600px]">
            <PostGameAnalysis g={g} />
          </div>
        </section>

        {/* Control deck */}
        <div className="w-full lg:col-span-5 lg:col-start-8 lg:row-start-2">
          <GameControls g={g} />
        </div>
        <div className="w-full lg:col-span-5 lg:col-start-8 lg:row-start-1">
          <GameStatusCard g={g} />
        </div>
        <div className="w-full rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-md lg:col-span-5 lg:col-start-8 lg:row-start-3">
            <Tabs defaultValue="learn">
              <TabsList className="w-full" data-testid="side-tabs">
                <TabsTrigger value="learn" data-testid="tab-learn">Showcases</TabsTrigger>
                <TabsTrigger value="rules" data-testid="tab-rules">Cheat sheet</TabsTrigger>
                <TabsTrigger value="archive" data-testid="tab-archive">Archive</TabsTrigger>
              </TabsList>
              <TabsContent value="learn" className="pt-3">
                <RuleShowcases g={g} />
              </TabsContent>
              <TabsContent value="rules" className="pt-3">
                <CheatSheet />
              </TabsContent>
              <TabsContent value="archive" className="pt-3">
                <MatchArchive />
              </TabsContent>
            </Tabs>
        </div>
      </main>
      <PromotionDialog g={g} />
    </>
  );
}

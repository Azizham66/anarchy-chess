import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AnarchGame } from '@/hooks/useAnarchGame';
import { GLYPH, PIECE_NAME } from './pieces';

export function PromotionDialog({ g }: { g: AnarchGame }) {
  const { promoChoice, setPromoChoice, applyMove, current } = g;
  const white = current.turn === 0;
  return (
    <Dialog open={promoChoice !== null} onOpenChange={(o) => !o && setPromoChoice(null)}>
      <DialogContent data-testid="promotion-dialog" className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Promote pawn</DialogTitle>
          <DialogDescription>A new piece restores Living Ally status for its type immediately.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-2">
          {(promoChoice ?? []).map((m) => (
            <button
              key={m.promo}
              type="button"
              data-testid={`promote-${PIECE_NAME[m.promo ?? 5].toLowerCase()}`}
              onClick={() => applyMove(m)}
              className="flex aspect-square flex-col items-center justify-center rounded-xl border border-border bg-sq-light transition-[transform,box-shadow] duration-150 hover:scale-105 hover:shadow-[0_0_0_3px_var(--kind-emu)]"
            >
              <span className={`piece-glyph text-4xl ${white ? 'piece-white' : 'piece-black'}`}>
                {GLYPH[m.promo ?? 5]}
                {'\uFE0E'}
              </span>
              <span className="mt-1 text-[10px] font-semibold text-[#3b2f22]">{PIECE_NAME[m.promo ?? 5]}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

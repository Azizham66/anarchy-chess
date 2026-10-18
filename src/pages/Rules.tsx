import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import { KIND_META } from '@/components/game/pieces';
import type { KindKey } from '@/components/game/pieces';

interface Section {
  id: string;
  title: string;
  kind?: KindKey;
  body: ReactNode;
}

const Ex = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 rounded-lg border-l-2 border-violet-500 bg-violet-500/10 px-3 py-2 text-sm text-foreground/85">
    <span className="font-semibold">Example: </span>
    {children}
  </p>
);

const SECTIONS: Section[] = [
  {
    id: 'goal',
    title: '1. The goal: capture the King',
    body: (
      <>
        <p>Anarch Chess uses a normal 8×8 board and the normal starting position. White moves first, and each player makes one move per turn.</p>
        <p>You win by <b>actually capturing</b> the enemy King. The game ends the moment that happens. There is no checkmate.</p>
        <p>You're allowed to <b>ignore check</b>. If your King is attacked you can make some other move, but your opponent can then take your King and win. One limit: you can never make your King's danger <i>worse</i> (see "Legal moves").</p>
      </>
    ),
  },
  {
    id: 'emulation',
    title: '2. Emulation: borrow another piece’s moves',
    kind: 'emu',
    body: (
      <>
        <p>Any piece except a pawn can move <b>like a different piece</b>, if two conditions are met:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li><b>Rank:</b> it can only copy a piece worth the same or less. Queen (9) ≥ Rook (5) ≥ Bishop (3) = Knight (3) ≥ Pawn (1).</li>
          <li><b>Living ally:</b> you need at least one piece of that type still on the board. Lose your last Bishop and nothing can move like a Bishop until you promote a new one.</li>
        </ul>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground"><tr><th className="py-1 pr-4">Piece</th><th className="py-1">Can also move like</th></tr></thead>
            <tbody className="divide-y divide-border">
              <tr><td className="py-1.5 pr-4 font-semibold">Queen</td><td>Knight, Pawn (she already has Rook and Bishop moves)</td></tr>
              <tr><td className="py-1.5 pr-4 font-semibold">Rook</td><td>Bishop, Knight, Pawn — never a Queen</td></tr>
              <tr><td className="py-1.5 pr-4 font-semibold">Bishop</td><td>Knight, Pawn</td></tr>
              <tr><td className="py-1.5 pr-4 font-semibold">Knight</td><td>Bishop, Pawn</td></tr>
              <tr><td className="py-1.5 pr-4 font-semibold">King</td><td>Rook, Bishop, Knight, Pawn — only onto empty squares, never capturing</td></tr>
              <tr><td className="py-1.5 pr-4 font-semibold">Pawn</td><td>Nothing</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3"><b>One move, one style.</b> A move uses exactly one movement pattern: one straight line, one knight jump, or one pawn step. You can't mix them.</p>
        <p><b>Copying a pawn</b> (non-pawn pieces only): one square forward onto an empty square, one square diagonally forward onto an empty square, or one square diagonally forward to capture an enemy piece other than the King. A piece copying a pawn gets no double step, no en passant and no promotion.</p>
        <Ex>A Rook on d4 can slide diagonally to f6 as long as one of your Bishops is still alive.</Ex>
      </>
    ),
  },
  {
    id: 'jump',
    title: '3. Friendly jump: fly over your own piece',
    kind: 'jump',
    body: (
      <>
        <p>A piece moving in a line (Rook, Bishop or Queen, including when emulating) may <b>jump over exactly one of your own pieces</b>. The jumped piece is <b>destroyed</b> (friendly fire). All of these must be true:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>It lands on an <b>empty</b> square. A jump can never capture.</li>
          <li>Only one friendly piece is on the path, and it isn't your King. The King can't jump either.</li>
          <li>The jump must not put the enemy King in a <b>new check</b>.</li>
        </ul>
        <p>You can <b>never</b> jump an enemy piece. A slider can't pass an enemy at all.</p>
        <Ex>Rook a1 and your own pawn on a3: the rook can jump to a4, a5, a6 or a7 (the pawn disappears). It can't go to a8 if that would give check.</Ex>
      </>
    ),
  },
  {
    id: 'pawns',
    title: '4. Pawn anarchy: diagonal step & trample',
    kind: 'tramp',
    body: (
      <>
        <p>Pawns keep all their normal moves (forward, double step, diagonal capture, en passant, promotion) and gain two more:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li><b>Diagonal step:</b> one square diagonally forward onto an <b>empty</b> square.</li>
          <li><b>Trample:</b> one square straight forward onto <b>your own</b> piece (not the King). That piece is destroyed and the pawn takes its square.</li>
        </ul>
        <p>Neither move captures, and neither may give check. Pawns can't emulate other pieces.</p>
        <Ex>Your pawn on e4 tramples your own Knight on e5. If that was your last Knight, none of your pieces can move like a Knight any more.</Ex>
      </>
    ),
  },
  {
    id: 'protection',
    title: '5. The King is protected',
    kind: 'std',
    body: (
      <>
        <p>Emulation, jumps, diagonal steps and tramples are called <b>Anarch moves</b>. Normal moves are called <b>standard moves</b>.</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Only a <b>standard</b> move can capture the King.</li>
          <li>An Anarch move can never <b>create a new check</b>, including a discovered check or a check from a promoted piece.</li>
          <li>Anarch moves can capture any other piece. Only the King is protected.</li>
          <li>"Check" only counts standard attacks. Emulation never gives check.</li>
        </ul>
        <Ex>A Rook emulating a Bishop can slide from a1 to g7, but it can never take a King on h8.</Ex>
      </>
    ),
  },
  {
    id: 'legal',
    title: '6. Legal moves, forced King moves & stalemate',
    body: (
      <>
        <p><b>Don't make it worse.</b> If your King moves, it can't move onto an attacked square. If your King stays put, your move can't add any <i>new</i> attacker on it. You can leave an existing check unanswered.</p>
        <p><b>Forced King move.</b> If you're in check and have no legal move, you still have to move. Your King must take a normal one-square step (no castling), even into attack. Usually it gets captured next turn.</p>
        <p><b>Stalemate.</b> If you have no legal move and you're <b>not</b> in check, the game is a draw. It's also a draw if a forced King has nowhere at all to step.</p>
      </>
    ),
  },
  {
    id: 'special',
    title: '7. Castling, en passant & promotion',
    body: (
      <>
        <p><b>Castling</b> works as in normal chess: the King and Rook haven't moved, the squares between are empty, and the King isn't in check, doesn't pass through an attacked square and doesn't land on one. You lose castling rights if anything moves from or to a Rook's starting square, including a piece destroyed there by a jump or trample.</p>
        <p><b>En passant</b> is normal. Only a real pawn double step allows it.</p>
        <p><b>Promotion</b> happens when a pawn reaches the last rank by any pawn move (normal, diagonal step or trample). You choose Queen, Rook, Bishop or Knight. The new piece counts as a living ally straight away. If an Anarch move would give check by promoting, it's illegal.</p>
      </>
    ),
  },
  {
    id: 'draws',
    title: '8. Draws',
    body: (
      <ul className="ml-5 list-disc space-y-1">
        <li><b>Stalemate</b>: see section 6.</li>
        <li><b>Threefold repetition</b>: the same position, same side to move, same castling rights and en passant square, three times.</li>
        <li><b>50-move rule</b>: 100 moves in a row (50 each) with no pawn move, no capture and no friendly-fire destruction.</li>
        <li><b>Dead position</b>: only the Kings are left, or the Kings plus a single Bishop or Knight.</li>
      </ul>
    ),
  },
  {
    id: 'markers',
    title: '9. Reading the board',
    body: (
      <>
        <p>Tap a piece and its moves light up in four colors:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(KIND_META) as KindKey[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-2.5 py-1 text-xs">
              <span className="size-2.5 rounded-full" style={{ background: KIND_META[k].color }} />
              {KIND_META[k].label}
            </span>
          ))}
        </div>
        <p className="mt-3">A dot means a move to an empty square. A ring means a capture or a trample. After a game, step through the review: each move gets a badge (★ Best, ✓ Good, ?! Inaccuracy, ? Mistake, ?? Blunder).</p>
      </>
    ),
  },
];

export default function Rules() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10" data-testid="rules-page">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Rulebook v1.1</p>
      <h2 className="mt-1 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">How to play Anarch Chess</h2>
      <p className="mt-3 text-muted-foreground">It's normal chess with four new freedoms and one hard rule: pieces can borrow each other's moves, jump or trample their own army, and the King can only fall to an honest, standard move.</p>

      <nav className="mt-6 flex flex-wrap gap-2" data-testid="rules-toc">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-full border border-border bg-panel px-3 py-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground">
            {s.title.replace(/^\d+\.\s*/, '').split(':')[0]}
          </a>
        ))}
      </nav>

      <div className="mt-6 space-y-4">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} data-testid={`rules-section-${s.id}`} className="scroll-mt-20 rounded-2xl border border-border bg-card/80 p-5 backdrop-blur-md">
            <h3 className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight">
              {s.kind && <span className="size-2.5 rounded-full" style={{ background: KIND_META[s.kind].color }} />}
              {s.title}
            </h3>
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground/85">{s.body}</div>
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link to="/" className={buttonVariants()} data-testid="rules-play-button">Play now</Link>
        <Link to="/about" className={buttonVariants({ variant: 'secondary' })}>About</Link>
      </div>
    </main>
  );
}

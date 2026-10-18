import { Link } from 'react-router-dom';
import { Bot, Cpu, Swords, Users } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

const POINTS = [
  { icon: Swords, title: 'A new variant', text: 'Normal chess plus emulation, friendly jumps and pawn tramples. You win by capturing the King, and there is no checkmate.' },
  { icon: Bot, title: 'A real opponent', text: 'Six AI levels, from Easy up to a deep-searching Maximum. The engine is written specifically for Anarch rules.' },
  { icon: Users, title: 'Play your way', text: 'Play the AI as White or Black, or pass the device back and forth for a two-player game.' },
  { icon: Cpu, title: 'Learn from every game', text: 'A live eval bar, an engine review after each game with move-by-move verdicts, rule showcases and a match archive.' },
];

export default function About() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10" data-testid="about-page">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">About</p>
      <h2 className="mt-1 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Chess, with the rules slightly loosened</h2>
      <p className="mt-3 text-muted-foreground">
        Anarch Chess began as a single-file prototype and grew into a full game. Your pieces can borrow each other's moves and sacrifice their own allies, and your King can only be captured by a fair, standard move.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-border bg-card/80 p-5 backdrop-blur-md">
            <Icon className="size-5 text-primary" />
            <h3 className="mt-2 font-heading font-bold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Rulebook v1.1 · engine and AI run entirely in your browser.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/" className={buttonVariants()} data-testid="about-play-button">Play now</Link>
        <Link to="/rules" className={buttonVariants({ variant: 'secondary' })} data-testid="about-rules-button">Read the rules</Link>
      </div>
    </main>
  );
}

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, Info, LayoutGrid, Menu, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { playSound, setSoundEnabled, soundEnabled } from '@/lib/sound';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Board', hint: 'Play the game', icon: LayoutGrid, id: 'board' },
  { to: '/rules', label: 'Rules', hint: 'The full rulebook, explained', icon: BookOpen, id: 'rules' },
  { to: '/about', label: 'About', hint: 'What Anarch Chess is', icon: Info, id: 'about' },
];

export function Header() {
  const [sound, setSound] = useState(soundEnabled());
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [open, setOpen] = useState(false);

  const toggleSound = () => {
    const on = !sound;
    setSoundEnabled(on);
    setSound(on);
    if (on) playSound('move');
  };
  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('anarch-theme', next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
    setDark(next);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 lg:px-8">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" data-testid="nav-menu-button" aria-label="Open menu" />}>
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72" data-testid="nav-drawer">
            <SheetHeader>
              <SheetTitle className="font-heading text-lg font-extrabold tracking-tight">ANARCH CHESS</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-3">
              {NAV.map(({ to, label, hint, icon: Icon, id }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  data-testid={`nav-link-${id}`}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-[background-color,color] duration-150',
                      isActive ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )
                  }
                >
                  <Icon className="size-5" />
                  <span>
                    <span className="block font-heading text-sm font-semibold">{label}</span>
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                  </span>
                </NavLink>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <NavLink to="/" className="flex items-center gap-2.5" data-testid="home-link">
          <span className="piece-glyph grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-amber-500 text-xl text-white shadow-[0_6px_20px_rgba(139,92,246,0.35)]">
            ♞{'\uFE0E'}
          </span>
          <div className="leading-tight">
            <h1 className="font-heading text-lg font-extrabold tracking-tight sm:text-xl" data-testid="app-title">ANARCH CHESS</h1>
            <p className="text-[11px] text-muted-foreground">Rulebook v1.1 · capture the King</p>
          </div>
        </NavLink>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggleSound} data-testid="sound-toggle" aria-label={sound ? 'Mute sounds' : 'Unmute sounds'}>
            {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="theme-toggle" aria-label="Toggle theme">
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}

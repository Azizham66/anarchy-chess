import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { Header } from '@/components/game/Header';

export function Layout() {
  return (
    <div className="board-felt min-h-svh">
      <Header />
      <Outlet />
      <Toaster richColors />
    </div>
  );
}

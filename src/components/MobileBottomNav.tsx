import React from 'react';
import { Home, Search, Plus, User } from 'lucide-react';

interface MobileBottomNavProps {
  onAddEvent: () => void;
  eventCount?: number;
}

export default function MobileBottomNav({ onAddEvent, eventCount = 0 }: MobileBottomNavProps) {
  return (
    <nav className="bottom-nav md:hidden">
      <div className="flex items-center justify-around py-2 px-4">
        <a
          href="/"
          className="flex flex-col items-center gap-0.5 py-1 px-3 text-gray-400 hover:text-neon-green transition-colors"
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Home</span>
        </a>

        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            document.querySelector('input[placeholder*="Search"]')?.scrollIntoView({ behavior: 'smooth' });
            (document.querySelector('input[placeholder*="Search"]') as HTMLInputElement)?.focus();
          }}
          className="flex flex-col items-center gap-0.5 py-1 px-3 text-gray-400 hover:text-neon-green transition-colors"
        >
          <Search className="h-5 w-5" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Search</span>
        </a>

        <button
          onClick={onAddEvent}
          className="flex items-center justify-center w-12 h-12 -mt-4 bg-neon-green/10 border border-neon-green/30 rounded-full text-neon-green hover:bg-neon-green/20 transition-all"
        >
          <Plus className="h-6 w-6" />
        </button>

        <a
          href="/userarea"
          className="flex flex-col items-center gap-0.5 py-1 px-3 text-gray-400 hover:text-neon-green transition-colors"
        >
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Profile</span>
        </a>
      </div>
    </nav>
  );
}

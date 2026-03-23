import React from 'react';
import { Music, Heart, Globe, Shield } from 'lucide-react';

interface FooterProps {
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  onAdminAccess?: () => void;
  pendingCount?: number;
}

export default function Footer({
  isAuthenticated = false,
  isAdmin = false,
  onAdminAccess,
  pendingCount = 0
}: FooterProps) {
  return (
    <footer className="bg-coal-800/50 border-t border-asphalt-600/30 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="text-xl">🎸</div>
            <h3 className="text-lg font-industrial text-gray-200 tracking-wide uppercase">
              PROGDEALER
            </h3>
          </div>

          <div className="flex items-center space-x-6 text-gray-500 text-sm">
            <div className="flex items-center space-x-1.5">
              <Music className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wide">Progressive Events</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Globe className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wide">In Europe</span>
            </div>

            {isAuthenticated && isAdmin && (
              <button
                onClick={() => window.location.href = '/adminarea'}
                className="flex items-center space-x-1.5 text-gray-500 hover:text-neon-green transition-colors duration-200"
                title="ADMIN PANEL"
              >
                <Shield className="h-3 w-3" />
                <span className="text-xs uppercase tracking-wide">Admin</span>
                {pendingCount > 0 && (
                  <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 text-[10px] font-bold rounded">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1.5 text-gray-600 text-xs">
            <span className="uppercase tracking-wide">Made with</span>
            <Heart className="h-3 w-3 text-red-500/50" />
            <span className="uppercase tracking-wide">for Prog Culture</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-asphalt-600/20">
          <p className="text-center text-gray-600 text-xs uppercase tracking-wide">
            &copy; 2025 ProgDealer - <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
          </p>
        </div>
      </div>
    </footer>
  );
}

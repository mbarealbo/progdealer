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
    <footer className="bg-coal-800 border-t-2 border-asphalt-600 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          {/* Logo and tagline */}
          <div className="flex items-center space-x-4">
            <div className="text-2xl">🎸</div>
            <div>
              <h3 className="text-xl font-industrial text-gray-100 tracking-wide uppercase">
                PROGDEALER
              </h3>
              <p className="text-gray-400 text-sm font-condensed uppercase tracking-wide">
                Live Electronic Music Culture
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center space-x-6 text-gray-400 font-condensed text-sm">
            <div className="flex items-center space-x-2">
              <Music className="h-4 w-4" />
              <span className="uppercase tracking-wide">Progressive Events</span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span className="uppercase tracking-wide">Europa</span>
            </div>
            
            {/* Admin Button - Only show for admin users */}
            {isAuthenticated && isAdmin && onAdminAccess && (
              <button
                onClick={onAdminAccess}
                className="flex items-center space-x-2 text-gray-400 hover:text-industrial-green-400 transition-colors duration-200"
                title="ADMIN PANEL"
              >
                <Shield className="h-3 w-3" />
                <span className="text-xs uppercase tracking-wide">Admin</span>
                {pendingCount > 0 && (
                  <span className="bg-yellow-600 text-black px-1 py-0.5 text-xs font-bold rounded">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Copyright */}
          <div className="flex items-center space-x-2 text-gray-500 font-condensed text-xs">
            <span className="uppercase tracking-wide">Made with</span>
            <Heart className="h-3 w-3 text-burgundy-500" />
            <span className="uppercase tracking-wide">for Prog Culture</span>
          </div>
        </div>

        {/* Bottom line */}
        <div className="mt-6 pt-4 border-t border-asphalt-600">
          <p className="text-center text-gray-500 text-xs font-condensed uppercase tracking-wide">
            © 2025 ProgDealer - Raccogliamo concerti prog, metal e alternativi automaticamente
          </p>
        </div>
      </div>
    </footer>
  );
}
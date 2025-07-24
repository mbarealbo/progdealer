import React from 'react';
import { X, UserPlus, LogIn } from 'lucide-react';
import GoogleAuth from './GoogleAuth';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthRequiredModal({ isOpen, onClose }: AuthRequiredModalProps) {
  if (!isOpen) return null;

  const handleGoToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-coal-800 border-2 border-asphalt-600 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <UserPlus className="h-6 w-6 text-industrial-green-600" />
            <h2 className="text-xl font-industrial text-gray-100 tracking-wide uppercase">
              REGISTRATION REQUIRED
            </h2>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-2 border-asphalt-500 text-gray-300 p-2 hover:border-burgundy-500 hover:text-white transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🎸</div>
          <p className="text-gray-300 font-condensed text-lg leading-relaxed mb-4">
            You need to register to add events.
          </p>
          <p className="text-gray-400 font-condensed text-sm leading-relaxed">
            Join the ProgDealer community to submit progressive music events and help build the ultimate prog database.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoToLogin}
            className="w-full bg-industrial-green-800 border-2 border-industrial-green-600 text-white px-4 py-3 uppercase tracking-wide font-condensed font-bold hover:bg-industrial-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <LogIn className="h-4 w-4" />
            <span>GO TO LOGIN</span>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-asphalt-600">
          <div className="text-center mb-4">
            <p className="text-gray-500 text-xs font-condensed uppercase tracking-wide">
              OR
            </p>
          </div>

          <GoogleAuth showLogout={false} />
        </div>

        <div className="mt-6 pt-4 border-t border-asphalt-600">
          <p className="text-gray-500 text-xs font-condensed uppercase tracking-wide text-center">
            Registration is free and takes less than a minute
          </p>
        </div>
      </div>
    </div>
  );
}
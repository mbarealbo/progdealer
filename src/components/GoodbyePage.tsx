import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function GoodbyePage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Start countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleRedirectNow = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-coal-900 bg-noise">
      {/* Header */}
      <header className="bg-coal-800 border-b-2 border-asphalt-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-20">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">🎸</div>
              <h1 className="text-3xl md:text-4xl font-industrial text-gray-100 tracking-mega-wide">
                PROGDEALER
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center min-h-[calc(100vh-5rem)] p-4">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
          </div>

          {/* Main Message */}
          <h2 className="text-4xl sm:text-5xl font-industrial text-gray-100 tracking-wide uppercase mb-6 leading-tight">
            GOODBYE!
          </h2>
          
          <div className="w-32 h-1 bg-green-600 mx-auto mb-8"></div>

          <div className="bg-coal-800 border-2 border-asphalt-600 p-8 mb-8">
            <p className="text-xl text-gray-300 font-condensed leading-relaxed mb-6">
              Your account has been <strong className="text-green-400">successfully deleted</strong>.
            </p>
            
            <p className="text-lg text-gray-400 font-condensed leading-relaxed mb-6">
              We're sorry to see you go. Thank you for being part of the ProgDealer community.
            </p>

            <div className="bg-coal-900 border border-asphalt-600 p-6">
              <h3 className="text-sm font-condensed font-bold text-gray-100 uppercase tracking-wide mb-4">
                What Happened
              </h3>
              <ul className="text-gray-300 font-condensed text-sm space-y-2 text-left">
                <li>✅ Your user account has been permanently deleted</li>
                <li>✅ All your submitted events have been removed</li>
                <li>✅ Your personal data has been erased from our systems</li>
                <li>✅ A confirmation email has been sent to your email address</li>
              </ul>
            </div>
          </div>

          {/* Countdown and Redirect */}
          <div className="bg-coal-800 border-2 border-industrial-green-600 p-6 mb-6">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-industrial-green-600"></div>
              <span className="text-gray-300 font-condensed font-bold uppercase tracking-wide">
                Redirecting to homepage in {countdown} seconds...
              </span>
            </div>
            
            <button
              onClick={handleRedirectNow}
              className="bg-industrial-green-600 border-2 border-industrial-green-600 text-white px-6 py-3 uppercase tracking-wide font-condensed font-bold hover:bg-industrial-green-700 hover:border-industrial-green-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
            >
              <span>GO TO HOMEPAGE NOW</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Footer Message */}
          <div className="text-center">
            <p className="text-gray-500 text-sm font-condensed uppercase tracking-wide mb-2">
              Thank you for using ProgDealer
            </p>
            <p className="text-gray-600 text-xs font-condensed">
              If you change your mind, you can always create a new account in the future.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
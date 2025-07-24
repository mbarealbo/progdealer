import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface GoogleAuthProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  buttonText?: string;
  showLogout?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

export default function GoogleAuth({ 
  onSuccess, 
  onError, 
  className = "",
  buttonText = "Continue with Google",
  showLogout = true
}: GoogleAuthProps) {
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const GOOGLE_CLIENT_ID = '1022711096361-kesedefvdj2tivlhb2tjl2d5vlseenp3.apps.googleusercontent.com';

  // Check current auth status
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setUserEmail(session?.user?.email || '');
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  // Load Google Identity Services script
  useEffect(() => {
    const loadGoogleScript = () => {
      // Check if script is already loaded
      if (window.google?.accounts?.id) {
        setScriptLoaded(true);
        initializeGoogleAuth();
        return;
      }

      // Check if script tag already exists
      const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          setScriptLoaded(true);
          initializeGoogleAuth();
        });
        return;
      }

      // Create and load the script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setScriptLoaded(true);
        initializeGoogleAuth();
      };
      script.onerror = () => {
        console.error('Failed to load Google Identity Services script');
        onError?.('Failed to load Google authentication service');
      };
      
      document.head.appendChild(script);
    };

    loadGoogleScript();
  }, []);

  const handleGoogleResponse = async (response: GoogleCredentialResponse) => {
    setIsLoading(true);
    
    try {
      console.log('Google credential received, signing in with Supabase...');
      
      // Use Supabase's signInWithIdToken method
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });

      if (error) {
        console.error('Supabase authentication error:', error);
        throw error;
      }

      if (data.user) {
        console.log('Successfully authenticated with Supabase:', data.user.email);
        setIsAuthenticated(true);
        setUserEmail(data.user.email || '');
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Google authentication error:', error);
      onError?.(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeGoogleAuth = () => {
    if (!window.google?.accounts?.id) {
      console.error('Google Identity Services not available');
      return;
    }

    try {
      // Initialize Google Identity Services
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Render the button if element exists and user is not authenticated
      if (googleButtonRef.current && !isAuthenticated) {
        const buttonWidth = Math.min(
          googleButtonRef.current.offsetWidth || 320,
          400,
        );
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: buttonWidth,
        });
      }
    } catch (error) {
      console.error('Error initializing Google Auth:', error);
      onError?.('Failed to initialize Google authentication');
    }
  };

  // Re-render button when auth status changes
  useEffect(() => {
    if (scriptLoaded && !isAuthenticated) {
      initializeGoogleAuth();
    }
  }, [scriptLoaded, isAuthenticated]);

  const handleLogout = async () => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      setIsAuthenticated(false);
      setUserEmail('');
      
      // Disable auto-select for next login
      if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
      }
      
      console.log('Successfully logged out');
    } catch (error: any) {
      console.error('Logout error:', error);
      onError?.(error.message || 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated && showLogout) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="bg-green-900 border-2 border-green-600 text-green-300 p-3 font-condensed text-sm uppercase tracking-wide text-center">
          ✅ SIGNED IN AS {userEmail}
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className="w-full bg-burgundy-800 border-2 border-burgundy-600 text-white px-4 py-3 uppercase tracking-wide font-condensed font-bold hover:bg-burgundy-700 transition-all duration-200 disabled:opacity-50 text-sm"
        >
          {isLoading ? 'SIGNING OUT...' : 'SIGN OUT'}
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Custom styled container for Google button */}
      <div className="relative flex justify-center">
        <div
          ref={googleButtonRef}
          className="w-full"
          style={{ minHeight: '44px' }}
        />
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium text-gray-700">Signing in...</span>
            </div>
          </div>
        )}
        
        {/* Fallback button if Google script fails to load */}
        {!scriptLoaded && !isLoading && (
          <button
            onClick={() => onError?.('Google authentication service is not available')}
            className="w-full bg-gray-100 border-2 border-gray-300 text-gray-700 px-4 py-3 transition-all duration-200 flex items-center justify-center space-x-3 text-sm font-medium"
          >
            <div className="w-5 h-5 bg-gray-400 rounded"></div>
            <span>Loading Google Sign-In...</span>
          </button>
        )}
      </div>
      
      <p className="text-xs text-gray-500 text-center font-condensed">
        By continuing with Google, you agree to our terms of service
      </p>
    </div>
  );
}
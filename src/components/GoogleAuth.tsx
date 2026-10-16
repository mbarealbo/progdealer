import { useEffect, useRef, useState } from 'react';
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
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
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
  showLogout = true
}: GoogleAuthProps) {
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  // The effects below must run once, but call the latest init/onError (set after their definitions).
  const latest = useRef<{ init: () => void; onError?: (error: string) => void }>({ init: () => {} });

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
        return;
      }

      // Check if script tag already exists
      const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => setScriptLoaded(true));
        return;
      }

      // Create and load the script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => setScriptLoaded(true); // the effect below initialises it, once
      script.onerror = () => {
        console.error('Failed to load Google Identity Services script');
        latest.current.onError?.('Failed to load Google authentication service');
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
    } catch (error) {
      console.error('Google authentication error:', error);
      onError?.((error instanceof Error && error.message) || 'Authentication failed');
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

  latest.current = { init: initializeGoogleAuth, onError };

  // Re-render button when auth status changes
  useEffect(() => {
    if (scriptLoaded && !isAuthenticated) {
      latest.current.init();
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
    } catch (error) {
      console.error('Logout error:', error);
      onError?.((error instanceof Error && error.message) || 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated && showLogout) {
    return (
      <div className={`gauth ${className}`}>
        <div className="alert-ok" role="status" style={{ marginBottom: 0 }}>Signed in as {userEmail}</div>
        <button type="button" className="btn btn-ghost" onClick={handleLogout} disabled={isLoading}>
          {isLoading ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    );
  }

  return (
    <div className={`gauth ${className}`}>
      <div className="gauth-slot">
        <div ref={googleButtonRef} style={{ minHeight: 44 }} />

        {isLoading && (
          <div className="gauth-busy" role="status"><span className="spin dark" /> Signing in…</div>
        )}

        {/* Placeholder while the Google script loads (or if it fails to load) */}
        {!scriptLoaded && !isLoading && (
          <button type="button" className="gauth-fallback" onClick={() => onError?.('Google authentication service is not available')} style={{ position: 'absolute', inset: 0 }}>
            Loading Google Sign-In…
          </button>
        )}
      </div>

      <p className="gauth-terms">By continuing with Google, you agree to our terms of service</p>
    </div>
  );
}

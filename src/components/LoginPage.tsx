import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, X, Eye, EyeOff, UserPlus, LogIn, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginPageProps {
  isAuthenticated: boolean;
  onAuthenticated: () => void;
}

export default function LoginPage({ isAuthenticated, onAuthenticated }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get the page user was trying to access
  const from = location.state?.from?.pathname || '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const validateForm = () => {
    if (!email || !password) {
      setError('Email and password are required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        onAuthenticated();
        navigate(from, { replace: true });
        resetForm();
      }
    } catch (error: any) {
      if (error.message?.includes('email_not_confirmed')) {
        setError('Please check your email and click the confirmation link before logging in.');
      } else if (error.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else {
        setError(error.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;

      if (data.user) {
        if (data.user.email_confirmed_at) {
          setTimeout(() => {
            onAuthenticated();
            navigate(from, { replace: true });
            resetForm();
          }, 500);
        } else {
          setSuccess('Registration successful! Please check your email to confirm your account.');
          setMode('login');
        }
      }
    } catch (error: any) {
      if (error.message?.includes('User already registered')) {
        setError('An account with this email already exists. Please try logging in instead.');
        setMode('login');
      } else {
        setError(error.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError('');
    setSuccess('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-coal-900 bg-noise">
      {/* Header */}
      <header className="bg-coal-800 border-b-2 border-asphalt-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-6">
              {/* Clickable Logo */}
              <button
                onClick={() => navigate('/')}
                className="flex items-center hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                title="BACK TO HOME"
              >
                <div className="text-2xl mr-2">🎸</div>
                <div className="text-lg font-industrial text-gray-100 tracking-wide uppercase">
                  PROGDEALER
                </div>
              </button>
              
              <button
                onClick={() => navigate('/')}
                className="industrial-button flex items-center space-x-2"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>BACK TO MAIN</span>
              </button>
              
              <div className="flex items-center space-x-4">
                <div className="text-4xl">🎸</div>
                <h1 className="text-3xl md:text-4xl font-industrial text-gray-100 tracking-mega-wide">
                  PROGDEALER
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center min-h-[calc(100vh-5rem)] p-4">
        <div className="bg-coal-800 border-2 border-asphalt-600 p-8 w-full max-w-md">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <Shield className="h-8 w-8 text-industrial-green-600" />
            <h2 className="text-2xl font-industrial text-gray-100 tracking-wide uppercase">
              {mode === 'login' ? 'LOGIN' : 'REGISTER'}
            </h2>
          </div>

          {/* Mode Toggle */}
          <div className="flex mb-6 bg-coal-900 border-2 border-asphalt-600">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-3 px-4 font-condensed font-bold uppercase tracking-wide text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                mode === 'login'
                  ? 'bg-industrial-green-600 text-white border-r-2 border-industrial-green-600'
                  : 'text-gray-400 hover:text-white border-r-2 border-asphalt-600'
              }`}
            >
              <LogIn className="h-4 w-4" />
              <span>LOGIN</span>
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-3 px-4 font-condensed font-bold uppercase tracking-wide text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                mode === 'register'
                  ? 'bg-industrial-green-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>REGISTER</span>
            </button>
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-900 border-2 border-green-600 text-green-300 p-3 mb-4 font-condensed text-sm uppercase tracking-wide">
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-burgundy-900 border-2 border-burgundy-600 text-burgundy-300 p-3 mb-4 font-condensed text-sm tracking-wide">
              {error}
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
                placeholder="YOUR EMAIL"
              />
            </div>

            <div>
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 pr-10 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
                  placeholder="PASSWORD"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-xs text-gray-500 mt-1 font-condensed">
                  Minimum 6 characters
                </p>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                  CONFIRM PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 pr-10 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
                    placeholder="CONFIRM PASSWORD"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-industrial-green-800 border-2 border-industrial-green-600 text-white px-4 py-3 uppercase tracking-wide font-condensed font-bold hover:bg-industrial-green-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>PROCESSING...</span>
                  </>
                ) : (
                  <>
                    {mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    <span>{mode === 'login' ? 'LOGIN' : 'REGISTER'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-asphalt-600">
            <p className="text-gray-500 text-xs font-condensed uppercase tracking-wide text-center">
              {mode === 'login' 
                ? 'New user? Click Register above to create an account.'
                : 'Already have an account? Click Login above.'
              }
            </p>
            <p className="text-gray-600 text-xs font-condensed mt-2 text-center">
              New users get standard user access. Contact admin for role upgrades.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
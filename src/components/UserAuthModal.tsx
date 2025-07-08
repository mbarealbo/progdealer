import React, { useState } from 'react';
import { User, X, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

export default function UserAuthModal({ isOpen, onClose, onAuthenticated }: UserAuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateForm = () => {
    if (!email || !password) {
      setError('Email and password are required');
      return false;
    }

    // Basic email format validation
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
        onClose();
        resetForm();
      }
    } catch (error: any) {
      // Handle specific Supabase auth errors
      if (error.message?.includes('email_not_confirmed')) {
        setError('Please check your email and click the confirmation link before logging in. Check your spam folder if you don\'t see it.');
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
          // User is immediately confirmed
          onAuthenticated();
          onClose();
          resetForm();
        } else {
          // User needs to confirm email
          setSuccess('Registration successful! Please check your email to confirm your account.');
          setMode('login');
        }
      }
    } catch (error: any) {
      // Handle specific Supabase auth errors
      if (error.message?.includes('email_address_invalid')) {
        setError('Please enter a valid email address. Make sure it\'s properly formatted (e.g., user@example.com).');
      } else if (error.message?.includes('User already registered')) {
        setError('An account with this email already exists. Please try logging in instead.');
        setMode('login');
      } else if (error.message?.includes('Password should be at least')) {
        setError('Password must be at least 6 characters long.');
      } else {
        setError(error.message || 'Registration failed');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-coal-800 border-2 border-asphalt-600 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <User className="h-6 w-6 text-industrial-green-600" />
            <h2 className="text-xl font-industrial text-gray-100 tracking-wide uppercase">
              USER AREA
            </h2>
          </div>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="bg-transparent border-2 border-asphalt-500 text-gray-300 p-2 hover:border-burgundy-500 hover:text-white transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
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

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="flex-1 bg-transparent border-2 border-asphalt-500 text-gray-300 px-4 py-2 uppercase tracking-wide font-condensed font-bold hover:border-burgundy-500 hover:text-white transition-all duration-200 text-sm"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-industrial-green-800 border-2 border-industrial-green-600 text-white px-4 py-2 uppercase tracking-wide font-condensed font-bold hover:bg-industrial-green-700 transition-all duration-200 disabled:opacity-50 text-sm flex items-center justify-center space-x-2"
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
          {mode === 'login' && (
            <p className="text-gray-600 text-xs font-condensed mt-2 text-center">
              If you just registered, check your email for a confirmation link before logging in.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Eye, EyeOff, Check, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if we have the required tokens from the URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (!accessToken || !refreshToken) {
      setError('Invalid or missing reset tokens. Please request a new password reset.');
    }
  }, [searchParams]);

  const validateForm = () => {
    if (!password || !confirmPassword) {
      setError('Both password fields are required');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
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
                onClick={() => navigate('/login')}
                className="industrial-button flex items-center space-x-2"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>BACK TO LOGIN</span>
              </button>
              
              <div className="flex items-center space-x-4">
                <Shield className="h-8 w-8 text-industrial-green-600" />
                <div>
                  <h1 className="text-2xl font-industrial text-gray-100 tracking-wide uppercase">
                    UPDATE PASSWORD
                  </h1>
                  <p className="text-gray-400 text-sm font-condensed uppercase tracking-wide">
                    Set Your New Password
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center min-h-[calc(100vh-5rem)] p-4">
        <div className="bg-coal-800 border-2 border-asphalt-600 p-8 w-full max-w-md">
          {success ? (
            <div className="text-center">
              <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-industrial text-gray-100 tracking-wide uppercase mb-4">
                PASSWORD UPDATED
              </h2>
              <p className="text-gray-300 font-condensed mb-6">
                Your password has been successfully updated. You will be redirected to the login page in a few seconds.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-industrial-green-600 border-2 border-industrial-green-600 text-white px-4 py-3 uppercase tracking-wide font-condensed font-bold hover:bg-industrial-green-700 transition-all duration-200"
              >
                GO TO LOGIN
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center space-x-3 mb-8">
                <Shield className="h-8 w-8 text-industrial-green-600" />
                <h2 className="text-2xl font-industrial text-gray-100 tracking-wide uppercase">
                  NEW PASSWORD
                </h2>
              </div>

              <p className="text-gray-300 font-condensed mb-6 text-center">
                Enter your new password below. Make sure it's at least 6 characters long.
              </p>

              {error && (
                <div className="bg-burgundy-900 border-2 border-burgundy-600 text-burgundy-300 p-3 mb-4 font-condensed text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                    NEW PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 pr-10 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
                      placeholder="NEW PASSWORD"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 font-condensed">
                    Minimum 6 characters
                  </p>
                </div>

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

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-industrial-green-800 border-2 border-industrial-green-600 text-white px-4 py-3 uppercase tracking-wide font-condensed font-bold hover:bg-industrial-green-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>UPDATING...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        <span>UPDATE PASSWORD</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-4 border-t border-asphalt-600">
                <p className="text-gray-500 text-xs font-condensed uppercase tracking-wide text-center">
                  Remember your password? 
                  <button
                    onClick={() => navigate('/login')}
                    className="text-industrial-green-400 hover:text-industrial-green-300 ml-1 transition-colors"
                  >
                    Go to Login
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

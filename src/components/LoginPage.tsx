import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, LogIn, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ForgotPasswordModal from './ForgotPasswordModal';
import GoogleAuth from './GoogleAuth';
import Logo from './brand/Logo';

interface LoginPageProps {
  isAuthenticated: boolean;
  onAuthenticated: () => void;
}

export default function LoginPage({ isAuthenticated, onAuthenticated }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#F5F4F2';
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
        options: { emailRedirectTo: window.location.origin },
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
    <div className="pd">
      <div className="detail-bar">
        <div className="detail-bar-inner">
          <button className="brand" onClick={() => navigate('/')} aria-label="ProgDealer home">
            <Logo height={26} />
          </button>
          <button className="linkbtn" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Back to shows
          </button>
        </div>
      </div>

      <div className="auth-wrap">
        <div className="auth-card">
          <h1 className="auth-title">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="auth-caption">
            {mode === 'login' ? 'Sign in to save shows and submit gigs.' : 'Join to track prog shows worldwide.'}
          </p>

          <div className="seg">
            <button className={mode === 'login' ? 'on' : ''} onClick={() => switchMode('login')} type="button">
              <LogIn size={15} /> Sign in
            </button>
            <button className={mode === 'register' ? 'on' : ''} onClick={() => switchMode('register')} type="button">
              <UserPlus size={15} /> Register
            </button>
          </div>

          {success && <div className="alert-ok">{success}</div>}
          {error && <div className="alert-err">{error}</div>}

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
            <div className="afield">
              <label htmlFor="email">Email</label>
              <input id="email" className="ainput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>

            <div className="afield">
              <label htmlFor="password">Password</label>
              <div className="ainput-wrap">
                <input id="password" className="ainput" style={{ paddingRight: 42 }} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
                <button type="button" className="eye" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'register' && <span className="hint">Minimum 6 characters</span>}
              {mode === 'login' && (
                <button type="button" className="forgot" onClick={() => setShowForgotPassword(true)}>
                  Forgot your password?
                </button>
              )}
            </div>

            {mode === 'register' && (
              <div className="afield">
                <label htmlFor="confirm">Confirm password</label>
                <div className="ainput-wrap">
                  <input id="confirm" className="ainput" style={{ paddingRight: 42 }} type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
                  <button type="button" className="eye" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <><span className="spin" /> Processing…</>
              ) : (
                <>{mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />} {mode === 'login' ? 'Sign in' : 'Create account'}</>
              )}
            </button>
          </form>

          <div className="auth-divider">or</div>

          <GoogleAuth
            onSuccess={() => {
              onAuthenticated();
              navigate(from, { replace: true });
            }}
            onError={(err) => setError(err)}
            showLogout={false}
          />

          <p className="auth-note">
            {mode === 'login' ? 'New here? Switch to Register above.' : 'Already have an account? Switch to Sign in above.'}
          </p>
        </div>
      </div>

      <ForgotPasswordModal isOpen={showForgotPassword} onClose={() => setShowForgotPassword(false)} />
    </div>
  );
}

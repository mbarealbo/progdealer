import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Logo from './brand/Logo';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess('Password updated. Taking you to sign in…');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setError((err instanceof Error && err.message) || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pd">
      <div className="detail-bar">
        <div className="detail-bar-inner">
          <button className="linkbtn" onClick={() => navigate('/')}>
            <ArrowLeft size={18} /> <span className="hide-mob">Back to shows</span>
          </button>
          <button className="brand" onClick={() => navigate('/')} aria-label="ProgDealer home">
            <Logo height={30} />
          </button>
          <span style={{ width: 44 }} aria-hidden="true" />
        </div>
      </div>

      <div className="auth-wrap">
        <div className="auth-card">
          <div className="eyebrow">Your account</div>
          <h1 className="auth-title">Set a new password</h1>
          <p className="auth-caption">Choose a password of at least 6 characters.</p>

          {success && <div className="alert-ok" role="status">{success}</div>}
          {error && <div className="alert-err" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="afield">
              <label htmlFor="rp-new">New password</label>
              <div className="ainput-wrap">
                <input id="rp-new" className="ainput" style={{ paddingRight: 46 }} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
                <button type="button" className="eye" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="afield">
              <label htmlFor="rp-confirm">Confirm password</label>
              <input id="rp-confirm" className="ainput" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? <><span className="spin" /> Updating…</> : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

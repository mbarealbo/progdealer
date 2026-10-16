import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccess('Password reset email sent. Check your inbox.');
    } catch (err) {
      setError((err instanceof Error && err.message) || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pd-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pd-modal narrow" role="dialog" aria-modal="true" aria-labelledby="fp-title">
        <div className="modal-head">
          <h2 id="fp-title">Reset your password</h2>
          <button className="iconx" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="modal-sub">Enter the email you signed up with and we'll send you a link to choose a new password.</p>

        {success && <div className="alert-ok" role="status">{success}</div>}
        {error && <div className="alert-err" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="afield">
            <label htmlFor="fp-email">Email</label>
            <input id="fp-email" className="ainput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" />
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? <><span className="spin" /> Sending…</> : 'Send reset link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

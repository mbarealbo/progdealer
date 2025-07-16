import React, { useState } from 'react';
import { Mail, X } from 'lucide-react';
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
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-coal-800 border-2 border-asphalt-600 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Mail className="h-6 w-6 text-industrial-green-600" />
            <h2 className="text-xl font-industrial text-gray-100 tracking-wide uppercase">Password Reset</h2>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-2 border-asphalt-500 text-gray-300 p-2 hover:border-burgundy-500 hover:text-white transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success && (
          <div className="bg-green-900 border-2 border-green-600 text-green-300 p-3 mb-4 font-condensed text-sm uppercase tracking-wide">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-burgundy-900 border-2 border-burgundy-600 text-burgundy-300 p-3 mb-4 font-condensed text-sm tracking-wide">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
              Email
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

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-transparent border-2 border-asphalt-500 text-gray-300 px-4 py-2 uppercase tracking-wide font-condensed font-bold hover:border-burgundy-500 hover:text-white transition-all duration-200 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-industrial-green-800 border-2 border-industrial-green-600 text-white px-4 py-2 uppercase tracking-wide font-condensed font-bold hover:bg-industrial-green-700 transition-all duration-200 disabled:opacity-50 text-sm"
            >
              {loading ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

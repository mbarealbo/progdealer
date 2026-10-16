import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountDeleted: () => void;
  userEmail: string;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  userEmail
}: DeleteAccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [error, setError] = useState('');

  const handleDeleteAccount = async () => {
    if (confirmationText !== 'DELETE') {
      setError('Please type "DELETE" to confirm account deletion');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get the current session to retrieve the JWT token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('User session not found. Please log in again.');
      }

      console.log('Calling delete-user Edge Function...');

      // Call the Supabase Edge Function to delete the user
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Edge Function error:', errorData);
        throw new Error(errorData.error || 'Failed to delete account');
      }

      const result = await response.json();
      console.log('Delete account result:', result);

      // If the Edge Function succeeds, sign out the user and redirect to goodbye page
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error('Error signing out:', signOutError);
        // Don't block the flow, the account has already been deleted on the backend
      }

      // Redirect to goodbye page instead of calling onAccountDeleted
      window.location.href = '/goodbye';

    } catch (error) {
      console.error('Error deleting account:', error);
      setError((error instanceof Error && error.message) || 'Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setConfirmationText('');
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    if (!loading) {
      resetModal();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pd-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="pd-modal narrow" role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-warn">
        <div className="modal-head">
          <h2 id="del-title">Delete your account</h2>
          <button className="iconx" onClick={handleClose} disabled={loading} aria-label="Close"><X size={18} /></button>
        </div>

        <div id="del-warn" className="alert-err" style={{ marginTop: 10 }}>
          This permanently deletes your account. It cannot be undone.
        </div>

        <div className="liner">
          <dl>
            <dt>Account</dt>
            <dd>{userEmail}</dd>
            <dt>Removed</dt>
            <dd>Your profile, every show you submitted, your login and your preferences</dd>
          </dl>
        </div>

        <div className="afield">
          <label htmlFor="del-confirm">Type DELETE to confirm</label>
          <input
            id="del-confirm"
            className="ainput"
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
            disabled={loading}
            placeholder="DELETE"
            autoComplete="off"
          />
        </div>

        {error && <div className="alert-err" role="alert">{error}</div>}

        <div className="modal-actions">
          <button className="ghost" onClick={handleClose} disabled={loading}>Cancel</button>
          <button
            className="btn btn-danger solid"
            style={{ height: 50, justifyContent: 'center', fontSize: '1rem' }}
            onClick={handleDeleteAccount}
            disabled={loading || confirmationText !== 'DELETE'}
          >
            {loading ? <><span className="spin" /> Deleting…</> : <><Trash2 size={16} /> Delete account</>}
          </button>
        </div>
      </div>
    </div>
  );
}

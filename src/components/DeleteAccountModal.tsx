import React, { useState } from 'react';
import { Trash2, X, AlertTriangle, Shield } from 'lucide-react';
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
  onAccountDeleted, 
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

      // If the Edge Function succeeds, sign out the user from the client
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('Error signing out:', signOutError);
        // Don't block the flow, the account has already been deleted on the backend
      }

      // Notify the parent component that the account was deleted
      onAccountDeleted();
      
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setError(error.message || 'Failed to delete account. Please try again.');
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
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-coal-800 border-2 border-burgundy-600 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-burgundy-600" />
            <h2 className="text-xl font-industrial text-gray-100 tracking-wide uppercase">
              DELETE ACCOUNT
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="bg-transparent border-2 border-asphalt-500 text-gray-300 p-2 hover:border-burgundy-500 hover:text-white transition-all duration-200 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning Message */}
        <div className="bg-burgundy-900 border-2 border-burgundy-600 p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-burgundy-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-burgundy-300 font-condensed font-bold uppercase tracking-wide text-sm mb-2">
                PERMANENT ACTION WARNING
              </h3>
              <p className="text-burgundy-300 text-sm font-condensed leading-relaxed">
                Are you sure you want to permanently delete your account? This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-coal-900 border border-asphalt-600 p-4 mb-6">
          <h4 className="text-gray-100 font-condensed font-bold uppercase tracking-wide text-sm mb-2">
            ACCOUNT TO BE DELETED
          </h4>
          <p className="text-gray-300 font-condensed text-sm">
            {userEmail}
          </p>
        </div>

        {/* What will be deleted */}
        <div className="bg-coal-900 border border-asphalt-600 p-4 mb-6">
          <h4 className="text-gray-100 font-condensed font-bold uppercase tracking-wide text-sm mb-3">
            WHAT WILL BE DELETED
          </h4>
          <ul className="text-gray-300 font-condensed text-sm space-y-1">
            <li>• Your user profile and account data</li>
            <li>• All events you have submitted</li>
            <li>• Your login credentials and access</li>
            <li>• All associated user preferences</li>
          </ul>
        </div>

        {/* Confirmation Input */}
        <div className="mb-6">
          <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
            TYPE "DELETE" TO CONFIRM
          </label>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
            disabled={loading}
            className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-burgundy-600 text-sm disabled:opacity-50"
            placeholder="TYPE DELETE HERE"
            autoComplete="off"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-burgundy-900 border-2 border-burgundy-600 text-burgundy-300 p-3 mb-4 font-condensed text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 bg-transparent border-2 border-asphalt-500 text-gray-300 px-4 py-2 uppercase tracking-wide font-condensed font-bold hover:border-asphalt-400 hover:text-white transition-all duration-200 text-sm disabled:opacity-50"
          >
            CANCEL
          </button>
          <button
            onClick={handleDeleteAccount}
            disabled={loading || confirmationText !== 'DELETE'}
            className="flex-1 bg-burgundy-800 border-2 border-burgundy-600 text-white px-4 py-2 uppercase tracking-wide font-condensed font-bold hover:bg-burgundy-700 transition-all duration-200 disabled:opacity-50 text-sm flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>DELETING...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>DELETE ACCOUNT</span>
              </>
            )}
          </button>
        </div>

        {/* Additional Warning */}
        <div className="mt-4 pt-4 border-t border-asphalt-600">
          <p className="text-gray-500 text-xs font-condensed uppercase tracking-wide text-center">
            This action is irreversible. Your account and all associated data will be permanently removed.
          </p>
        </div>
      </div>
    </div>
  );
}
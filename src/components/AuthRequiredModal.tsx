import { X, UserPlus, LogIn } from 'lucide-react';
import GoogleAuth from './GoogleAuth';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthRequiredModal({ isOpen, onClose }: AuthRequiredModalProps) {
  if (!isOpen) return null;

  const handleGoToLogin = () => { window.location.href = '/login'; };

  return (
    <div className="pd-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pd-modal" role="dialog" aria-modal="true" aria-label="Sign in required" style={{ maxWidth: 420, textAlign: 'center' }}>
        <div className="modal-head">
          <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            <UserPlus size={20} color="#E1341E" /> Sign in required
          </h2>
          <button className="iconx" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <p className="modal-sub" style={{ marginTop: 8 }}>
          Create a free account to submit shows and help build the worldwide prog catalog. It takes under a minute.
        </p>

        <button className="submit-btn" onClick={handleGoToLogin}>
          <LogIn size={16} /> Go to sign in
        </button>

        <div className="auth-divider">or</div>

        <GoogleAuth showLogout={false} />
      </div>
    </div>
  );
}

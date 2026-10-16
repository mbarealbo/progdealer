import { X, LogIn } from 'lucide-react';
import GoogleAuth from './GoogleAuth';
import { LogoMark } from './brand/Logo';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthRequiredModal({ isOpen, onClose }: AuthRequiredModalProps) {
  if (!isOpen) return null;

  const handleGoToLogin = () => { window.location.href = '/login'; };

  return (
    <div className="pd-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pd-modal narrow" role="dialog" aria-modal="true" aria-labelledby="auth-req-title">
        <div className="modal-head">
          <LogoMark size={44} />
          <button className="iconx" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <h2 id="auth-req-title" style={{ marginTop: 14 }}>Sign in to add a show</h2>
        <p className="modal-sub" style={{ marginTop: 10 }}>
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

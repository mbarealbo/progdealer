import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import Logo from './brand/Logo';

// Shared sticky top bar for the internal panels (user / admin).
export default function PanelHeader({ onBack, backLabel = 'Back', right }: { onBack?: () => void; backLabel?: string; right?: ReactNode }) {
  return (
    <div className="detail-bar">
      <div className="detail-bar-inner" style={{ maxWidth: 980 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="brand" onClick={() => (window.location.href = '/')} aria-label="ProgDealer home">
            <Logo height={26} />
          </button>
          {onBack && (
            <button className="linkbtn" onClick={onBack}>
              <ArrowLeft size={16} /> {backLabel}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>{right}</div>
      </div>
    </div>
  );
}

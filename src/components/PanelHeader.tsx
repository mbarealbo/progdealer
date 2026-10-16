import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import Logo from './brand/Logo';

// Shared sticky top bar for the internal pages (user / admin / account states).
export default function PanelHeader({ onBack, backLabel = 'Back', right }: { onBack?: () => void; backLabel?: string; right?: ReactNode }) {
  return (
    <div className="detail-bar">
      <div className="detail-bar-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
          <button className="brand" onClick={() => (window.location.href = '/')} aria-label="ProgDealer home">
            <Logo height={30} />
          </button>
          {onBack && (
            <button className="linkbtn" onClick={onBack}>
              <ArrowLeft size={18} /> <span className="hide-mob">{backLabel}</span>
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>{right}</div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Logo from './brand/Logo';

export default function GoodbyePage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="pd">
      <div className="detail-bar">
        <div className="detail-bar-inner" style={{ justifyContent: 'center' }}>
          <Logo height={30} />
        </div>
      </div>

      <div className="page-center">
        <div className="state-card">
          <div className="eyebrow">End of side B</div>
          <h1>Goodbye, and thanks for listening.</h1>
          <p>Your account has been deleted. We're sorry to see you go: thank you for being part of the ProgDealer community.</p>

          <div className="liner">
            <div className="liner-head eyebrow">What happened</div>
            <dl>
              <dt>Account</dt>
              <dd>Permanently deleted</dd>
              <dt>Your shows</dt>
              <dd>Removed from the catalog</dd>
              <dt>Personal data</dt>
              <dd>Erased from our systems</dd>
              <dt>Email</dt>
              <dd>A confirmation is on its way to your inbox</dd>
            </dl>
          </div>

          <p className="label" style={{ marginTop: 22 }} aria-live="polite">Back to the homepage in {countdown} s</p>
          <button className="btn btn-accent" style={{ marginTop: 12 }} onClick={() => navigate('/', { replace: true })}>
            Go to the homepage now <ArrowRight size={16} />
          </button>
          <p style={{ marginTop: 18, fontSize: '0.9rem' }}>Changed your mind? You can always create a new account later.</p>
        </div>
      </div>
    </div>
  );
}

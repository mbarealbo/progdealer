import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cookie } from 'lucide-react';
import Logo from './brand/Logo';
import { openCookieSettings } from '../lib/consent';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#F5F4F2';
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  return (
    <div className="pd">
      <header className="topbar">
        <div className="wrap topbar-inner">
          <button className="brand" onClick={() => navigate('/')} aria-label="ProgDealer home">
            <Logo height={28} />
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Back to home
          </button>
        </div>
      </header>

      <main className="wrap legal">
        <div className="legal-head">
          <div className="eyebrow">Legal · Your data</div>
          <h1>Privacy Policy</h1>
          <div className="legal-meta">
            <span><b>Effective date:</b> July 2025</span>
            <span><b>Last updated:</b> 13 July 2026</span>
            <span><b>Data Controller:</b> Alberto Abate — VAT ID 05532500872</span>
            <span><b>Contact:</b> <a href="mailto:privacy@progdealer.com">privacy@progdealer.com</a></span>
          </div>
        </div>

        <div className="legal-body">
          <section>
            <h2>1. What is ProgDealer?</h2>
            <p>
              ProgDealer is an independent, non-commercial project that collects, displays and
              manages live progressive and alternative music events on an interactive worldwide map.
              Registered users can submit new shows to a shared catalog. The service runs on Supabase
              (database &amp; authentication) and Netlify (hosting).
            </p>
          </section>

          <section>
            <h2>2. What data we collect</h2>
            <ul>
              <li><strong>Email address</strong> — when you register, or sign in with Google.</li>
              <li><strong>Technical/connection data</strong> — e.g. IP address and request logs kept by our hosting provider.</li>
              <li><strong>User-submitted content</strong> — the events you add to the catalog.</li>
              <li><strong>Usage data</strong> — only if you consent to analytics cookies (see §6 and §9).</li>
            </ul>
            <p>We do not require names, photos or other personal identifiers.</p>
          </section>

          <section>
            <h2>3. How we collect your data</h2>
            <ul>
              <li><strong>Directly</strong> — when you register or submit an event.</li>
              <li><strong>Automatically</strong> — server logs, and, with your consent, analytics tools.</li>
              <li><strong>Via Google Sign-In</strong> — if you choose it, we receive only your email address.</li>
            </ul>
          </section>

          <section>
            <h2>4. Why we collect your data</h2>
            <ul>
              <li>To let you register and sign in securely.</li>
              <li>To let you submit and manage music events.</li>
              <li>To understand aggregate, anonymous usage and improve the site — only with your consent.</li>
            </ul>
            <p>We do not use your data for profiling, advertising or automated decision-making.</p>
          </section>

          <section>
            <h2>5. Legal basis for processing</h2>
            <ul>
              <li><strong>Contract</strong> — creating and managing your account and submissions.</li>
              <li><strong>Legitimate interest</strong> — keeping the service secure and operational.</li>
              <li><strong>Consent</strong> — analytics and behaviour cookies, which load only after you opt in.</li>
            </ul>
          </section>

          <section>
            <h2>6. Third-party services</h2>
            <p>We rely on the following providers:</p>
            <ul>
              <li><strong>Supabase</strong> — database, authentication and transactional email.</li>
              <li><strong>Netlify</strong> — hosting and server logs.</li>
              <li><strong>Google Sign-In</strong> — optional authentication; only your email is retrieved.</li>
              <li><strong>Google Analytics</strong> — anonymous, aggregated usage statistics (analytics cookies; consent required).</li>
              <li><strong>Lucky Orange</strong> — heatmaps and anonymised session replay to spot usability issues (behaviour cookies; consent required).</li>
            </ul>
            <p>Google Analytics and Lucky Orange are <strong>not loaded until you give consent</strong>. No other third party processes your personal data.</p>
          </section>

          <section>
            <h2>7. Data retention</h2>
            <p>Your data is stored on GDPR-compliant infrastructure (Supabase, Netlify) and kept only as long as needed to provide the service.</p>
            <p>If an account stays inactive for 24 months you will receive a warning email; with no response, the account and all related data are permanently deleted.</p>
          </section>

          <section>
            <h2>8. Your rights</h2>
            <p>Under the GDPR you can access, correct, delete or export your data, object to processing, and withdraw consent at any time.</p>
            <p>You can delete your account directly from your profile. For anything else, email <a href="mailto:privacy@progdealer.com">privacy@progdealer.com</a>. Please note this is an independent project run outside standard office hours.</p>
          </section>

          <section>
            <h2>9. Cookies &amp; consent</h2>
            <p>We use a self-hosted consent banner (no third-party consent provider). Cookies fall into three categories:</p>
            <ul>
              <li><strong>Strictly necessary</strong> — always on. Needed for navigation, security and keeping you signed in. These do not track you.</li>
              <li><strong>Analytics</strong> — Google Analytics. Loaded only if you opt in.</li>
              <li><strong>Behaviour &amp; session replay</strong> — Lucky Orange. Loaded only if you opt in.</li>
            </ul>
            <p>You can accept all, reject non-essential cookies, or choose per category — and change or withdraw your choice at any time.</p>
            <button className="btn btn-accent legal-cta" onClick={openCookieSettings}>
              <Cookie size={16} /> Manage cookie preferences
            </button>
          </section>

          <p className="legal-updated">Last updated 13 July 2026</p>
        </div>
      </main>
    </div>
  );
}

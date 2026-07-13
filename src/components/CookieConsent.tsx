import { useEffect, useState } from 'react';
import { Cookie, X } from 'lucide-react';
import { readConsent, saveConsent } from '../lib/consent';

/**
 * Self-hosted, GDPR-valid cookie consent. Renders once at app root (all routes).
 * - No non-essential tracker loads until the visitor opts in (see lib/consent).
 * - Equal-weight "Accept all" / "Reject all", plus granular preferences.
 * - Reopenable from anywhere via the `pd:open-cookie-settings` event.
 */
export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (!existing) {
      setOpen(true); // first visit / expired → ask
    } else {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }

    const reopen = () => {
      const cur = readConsent();
      setAnalytics(cur?.analytics ?? false);
      setMarketing(cur?.marketing ?? false);
      setPrefs(true);
      setOpen(true);
    };
    window.addEventListener('pd:open-cookie-settings', reopen);
    return () => window.removeEventListener('pd:open-cookie-settings', reopen);
  }, []);

  const done = () => { setOpen(false); setPrefs(false); };
  const acceptAll = () => { saveConsent(true, true); done(); };
  const rejectAll = () => { saveConsent(false, false); done(); };
  const savePrefs = () => { saveConsent(analytics, marketing); done(); };

  if (!open) return null;

  return (
    <div className="cc-root" role="dialog" aria-modal="true" aria-label="Cookie preferences">
      <div className="cc-backdrop" onClick={prefs ? () => setPrefs(false) : undefined} />

      {!prefs ? (
        <section className="cc-card cc-banner">
          <div className="cc-head">
            <Cookie size={20} className="cc-ico" aria-hidden />
            <h2>We value your privacy</h2>
          </div>
          <p className="cc-text">
            We use cookies to run this site and, only with your consent, to understand how it's
            used so we can improve it. You can accept all, reject non-essential ones, or choose
            per category. See our <a href="/privacy">Privacy&nbsp;Policy</a>.
          </p>
          <div className="cc-actions">
            <button className="cc-btn cc-ghost" onClick={() => setPrefs(true)}>Preferences</button>
            <button className="cc-btn cc-ghost" onClick={rejectAll}>Reject all</button>
            <button className="cc-btn cc-solid" onClick={acceptAll}>Accept all</button>
          </div>
        </section>
      ) : (
        <section className="cc-card cc-prefs">
          <div className="cc-prefs-head">
            <h2>Cookie preferences</h2>
            <button className="cc-close" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
          </div>
          <p className="cc-text">
            Necessary cookies are always on. Turn the others on to allow the described use. You can
            change this any time from the “Cookie settings” link in the footer.
          </p>

          <ul className="cc-list">
            <li className="cc-item">
              <div className="cc-item-txt">
                <strong>Strictly necessary</strong>
                <span>Required for the site to work (page navigation, security, saving your login). No tracking.</span>
              </div>
              <span className="cc-lock">Always on</span>
            </li>

            <li className="cc-item">
              <div className="cc-item-txt">
                <strong>Analytics</strong>
                <span>Google Analytics — anonymous, aggregated stats about how the site is used.</span>
              </div>
              <label className="cc-switch">
                <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
                <span className="cc-slider" />
              </label>
            </li>

            <li className="cc-item">
              <div className="cc-item-txt">
                <strong>Behaviour &amp; session replay</strong>
                <span>Lucky Orange — heatmaps and anonymised session recordings to spot usability issues.</span>
              </div>
              <label className="cc-switch">
                <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
                <span className="cc-slider" />
              </label>
            </li>
          </ul>

          <div className="cc-actions">
            <button className="cc-btn cc-ghost" onClick={rejectAll}>Reject all</button>
            <button className="cc-btn cc-ghost" onClick={acceptAll}>Accept all</button>
            <button className="cc-btn cc-solid" onClick={savePrefs}>Save choices</button>
          </div>
        </section>
      )}
    </div>
  );
}

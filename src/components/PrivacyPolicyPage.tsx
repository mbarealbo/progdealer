import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-coal-900 bg-noise">
      <header className="bg-coal-800 border-b-2 border-asphalt-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center space-x-4 sm:space-x-6">
              <button
                onClick={() => navigate('/')}
                className="flex items-center hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                title="BACK TO HOME"
              >
                <div className="text-xl sm:text-2xl mr-2">🎸</div>
                <div className="text-sm sm:text-lg font-industrial text-gray-100 tracking-wide uppercase">
                  PROGDEALER
                </div>
              </button>
              <button
                onClick={() => navigate('/')}
                className="industrial-button flex items-center space-x-2 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">BACK TO MAIN</span>
                <span className="sm:hidden">BACK</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex justify-center p-4">
        <div className="max-w-3xl w-full bg-coal-800 border-2 border-asphalt-600 p-6 sm:p-8 space-y-6">
          <h1 className="text-2xl font-industrial text-gray-100 tracking-wide uppercase">
            Privacy Policy – ProgDealer
          </h1>
          <p className="text-gray-300 font-condensed text-sm leading-relaxed space-y-2">
            <span className="block">Effective date: July 2025</span>
            <span className="block">Last updated: July 17, 2025</span>
            <span className="block">Data Controller: Alberto Abate, VAT ID: 05532500872</span>
            <span className="block">Contact: privacy@progdealer.com</span>
          </p>

          <section className="space-y-4 text-gray-300 font-condensed text-sm leading-relaxed">
            <h2 className="text-lg font-industrial text-gray-100 uppercase">1. What is ProgDealer?</h2>
            <p>
              ProgDealer is a hobby project created to collect, display, and manage events related to progressive rock and alternative music. The site allows users to register and submit new music events to a shared calendar, using Supabase and Netlify as core technologies.
            </p>
          </section>

          <section className="space-y-4 text-gray-300 font-condensed text-sm leading-relaxed">
            <h2 className="text-lg font-industrial text-gray-100 uppercase">2. What data we collect</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Email address (via registration or social login – Google or Facebook only)</li>
              <li>IP address and device data (via Netlify logs)</li>
              <li>User-submitted content (e.g., events added to the calendar)</li>
              <li>Behavioral data (via analytics tools)</li>
            </ul>
            <p>We do not collect or require names, photos, or other personal identifiers.</p>
          </section>

          <section className="space-y-4 text-gray-300 font-condensed text-sm leading-relaxed">
            <h2 className="text-lg font-industrial text-gray-100 uppercase">3. How we collect your data</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Directly: When a user registers or submits an event</li>
              <li>Automatically: Through tools like Google Analytics and Lucky Orange</li>
              <li>Via third parties: When logging in using Google or Facebook (only the email is collected)</li>
            </ul>
          </section>

          <section className="space-y-4 text-gray-300 font-condensed text-sm leading-relaxed">
            <h2 className="text-lg font-industrial text-gray-100 uppercase">4. Why we collect your data</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>To allow registration and secure login</li>
              <li>To let users submit music events</li>
              <li>To analyze anonymous usage trends and improve site usability (UX/UI)</li>
            </ul>
            <p>We do not use your data for profiling, advertising, or automated decision-making.</p>
          </section>

          <section className="space-y-4 text-gray-300 font-condensed text-sm leading-relaxed">
            <h2 className="text-lg font-industrial text-gray-100 uppercase">5. Legal basis for processing</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Contractual necessity (e.g., creating and managing your account)</li>
              <li>Legitimate interest (e.g., improving UX based on analytics)</li>
              <li>Consent (e.g., cookie acceptance via Cookiebot)</li>
            </ul>
          </section>

          <section className="space-y-4 text-gray-300 font-condensed text-sm leading-relaxed">
            <h2 className="text-lg font-industrial text-gray-100 uppercase">6. Third-party services</h2>
            <p>We rely on the following providers, all GDPR-compliant:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Supabase (database, authentication, and email delivery)</li>
              <li>Netlify (hosting and server-side logs)</li>
              <li>Resend (transactional email service)</li>
              <li>Google Analytics and Lucky Orange (behavioral analysis)</li>
              <li>Cookiebot (cookie consent management)</li>
              <li>Google / Facebook Login (only the email is retrieved when used)</li>
            </ul>
            <p>No other third-party shares or processes your personal data.</p>
          </section>

          <section className="space-y-4 text-gray-300 font-condensed text-sm leading-relaxed">
            <h2 className="text-lg font-industrial text-gray-100 uppercase">7. Data retention</h2>
            <p>Your data is stored on GDPR-compliant infrastructure (Supabase, Netlify).</p>
            <p>Data is retained only as long as necessary to provide the service.</p>
            <p>If an account remains inactive for 24 months, the user will receive a warning email. In absence of response, the account and all related data will be permanently deleted.</p>
          </section>

          <section className="space-y-4 text-gray-300 font-condensed text-sm leading-relaxed">
            <h2 className="text-lg font-industrial text-gray-100 uppercase">8. User rights</h2>
            <p>Under the GDPR, you can:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Access your data</li>
              <li>Request deletion</li>
              <li>Object to processing</li>
              <li>Correct or update your data</li>
            </ul>
            <p>You may delete your account directly from your personal profile. If you encounter any issue, email us at privacy@progdealer.com. Please note this is a hobby project and we do not operate during standard office hours.</p>
          </section>

          <section className="space-y-4 text-gray-300 font-condensed text-sm leading-relaxed">
            <h2 className="text-lg font-industrial text-gray-100 uppercase">9. Cookies</h2>
            <p>This site uses technical and analytics cookies. A cookie banner powered by Cookiebot is active to allow users to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Accept or reject cookies</li>
              <li>Customize preferences</li>
              <li>Revoke consent at any time</li>
            </ul>
            <p>A full Cookie Policy page will be published soon.</p>
          </section>
        </div>
      </main>
    </div>
  );
}

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import PanelHeader from './PanelHeader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({
  children,
  isAuthenticated,
  isAdmin,
  loading,
  requireAdmin = false
}: ProtectedRouteProps) {
  const location = useLocation();

  if (loading) {
    return (
      <div className="pd">
        <div className="page-center" style={{ minHeight: '100vh' }}>
          <div className="state-loading"><span className="spin dark" /><span className="label">Checking access…</span></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="pd">
        <PanelHeader onBack={() => window.history.back()} backLabel="Back" />
        <div className="page-center">
          <div className="state-card">
            <div className="eyebrow">Backstage · staff only</div>
            <h1>Admin access required</h1>
            <p>
              This area is restricted to administrators. Your account has standard user access.
              If you think you should have admin rights, contact the person who runs ProgDealer.
            </p>
            <div className="liner">
              <dl>
                <dt>Your access</dt>
                <dd><span className="role-tag user" style={{ marginTop: 0 }}>user</span></dd>
              </dl>
            </div>
            <button className="btn btn-accent" onClick={() => (window.location.href = '/')}>Back to the shows</button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { User as SupabaseUser } from '@supabase/auth-js';
import { supabase } from './lib/supabase';
import { useUserRole } from './hooks/useUserRole';
import HomePage from './components/HomePage';
import EventDetailPage from './components/EventDetailPage';
import { HubPage, IndexPage } from './components/hubs/HubPages';
import ProtectedRoute from './components/ProtectedRoute';
import CookieConsent from './components/CookieConsent';

// Pages people rarely land on load on demand, so the home, event and hub pages
// (where search traffic arrives) ship less JavaScript.
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const UserPanel = lazy(() => import('./components/UserPanel'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage'));
const GoodbyePage = lazy(() => import('./components/GoodbyePage'));
const PrivacyPolicyPage = lazy(() => import('./components/PrivacyPolicyPage'));
const WidgetPage = lazy(() => import('./components/WidgetPage'));

const PAGE_LOADING = (
  <div className="pd"><div className="page-center"><div className="state-loading"><span className="spin dark" /></div></div></div>
);

function App() {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { profile, isAdmin, loading: roleLoading } = useUserRole(currentUser);

  useEffect(() => {
    checkAuthStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setCurrentUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    setCurrentUser(session?.user || null);
  };

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
    setTimeout(() => {
      checkAuthStatus();
    }, 300);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  return (
    <Router>
      <Suspense fallback={PAGE_LOADING}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/event/:id" element={<EventDetailPage />} />
        <Route path="/artist/:slug" element={<HubPage kind="artist" />} />
        <Route path="/festival/:slug" element={<HubPage kind="festival" />} />
        <Route path="/city/:slug" element={<HubPage kind="city" />} />
        <Route path="/country/:slug" element={<HubPage kind="country" />} />
        <Route path="/genre/:slug" element={<HubPage kind="genre" />} />
        <Route path="/festivals" element={<IndexPage kind="festivals" />} />
        <Route path="/artists" element={<IndexPage kind="artists" />} />
        <Route path="/cities" element={<IndexPage kind="cities" />} />
        <Route path="/widget" element={<WidgetPage />} />
        <Route path="/goodbye" element={<GoodbyePage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route
          path="/login"
          element={
            <LoginPage
              isAuthenticated={isAuthenticated}
              onAuthenticated={handleAuthenticated}
            />
          }
        />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected User Routes */}
        <Route
          path="/userarea"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              isAdmin={isAdmin}
              loading={roleLoading}
            >
              <UserPanel
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
                userProfile={profile}
                onAuthRequired={() => {}}
                onLogout={handleLogout}
                onBackToMain={() => window.location.href = '/'}
              />
            </ProtectedRoute>
          }
        />

        {/* Protected Admin Routes */}
        <Route
          path="/adminarea"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              isAdmin={isAdmin}
              loading={roleLoading}
              requireAdmin={true}
            >
              <AdminPanel
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
                userProfile={profile}
                onAuthRequired={() => {}}
                onLogout={handleLogout}
                onBackToMain={() => window.location.href = '/'}
              />
            </ProtectedRoute>
          }
        />

        {/* Catch all route - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      <CookieConsent />
    </Router>
  );
}

export default App;

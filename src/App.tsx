import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { User as SupabaseUser } from '@supabase/auth-js';
import { supabase } from './lib/supabase';
import { useUserRole } from './hooks/useUserRole';
import HomePage from './components/HomePage';
import EventDetailPage from './components/EventDetailPage';
import AdminPanel from './components/AdminPanel';
import UserPanel from './components/UserPanel';
import LoginPage from './components/LoginPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import ProtectedRoute from './components/ProtectedRoute';
import GoodbyePage from './components/GoodbyePage';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import CookieConsent from './components/CookieConsent';

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
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/event/:id" element={<EventDetailPage />} />
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
      <CookieConsent />
    </Router>
  );
}

export default App;

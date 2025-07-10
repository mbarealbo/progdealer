import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface AuthenticatedLayoutProps {
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  onLogout?: () => void;
  pendingCount?: number;
}

export default function AuthenticatedLayout({ 
  isAuthenticated = false,
  isAdmin = false,
  onLogout,
  pendingCount = 0
}: AuthenticatedLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-coal-900 bg-noise">
      <Navbar 
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        onLogout={onLogout}
        showSearch={false} // Non mostriamo la ricerca nella navbar dell'area utente
      />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer 
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        pendingCount={pendingCount}
      />
    </div>
  );
}
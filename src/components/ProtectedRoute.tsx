import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Shield, AlertTriangle, ArrowLeft } from 'lucide-react';

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

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-coal-900 bg-noise flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-industrial-green-600 mx-auto mb-4"></div>
          <p className="text-gray-400 font-condensed uppercase tracking-wide">
            VERIFYING ACCESS...
          </p>
        </div>
      </div>
    );
  }

  // Check authentication
  if (!isAuthenticated) {
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check admin access if required
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-coal-900 bg-noise">
        {/* Header */}
        <header className="bg-coal-800 border-b-2 border-asphalt-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              <div className="flex items-center space-x-4 sm:space-x-6">
                <button
                  onClick={() => window.history.back()}
                  className="industrial-button flex items-center space-x-2 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
                >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>BACK</span>
                </button>
                
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-burgundy-600" />
                  <div>
                    <h1 className="text-lg sm:text-2xl font-industrial text-gray-100 tracking-wide uppercase">
                      ACCESS DENIED
                    </h1>
                    <p className="text-gray-400 text-xs sm:text-sm font-condensed uppercase tracking-wide">
                      Insufficient Permissions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Access Denied Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center">
            <div className="text-6xl sm:text-8xl mb-6 sm:mb-8">🚫</div>
            <h2 className="text-2xl sm:text-4xl font-industrial text-gray-100 tracking-wide uppercase mb-4 sm:mb-6">
              ADMIN ACCESS REQUIRED
            </h2>
            <div className="w-24 sm:w-32 h-1 bg-burgundy-600 mx-auto mb-6 sm:mb-8"></div>
            
            <div className="bg-coal-800 border-2 border-asphalt-600 p-6 sm:p-8 max-w-2xl mx-auto">
              <div className="flex items-center justify-center space-x-3 mb-4 sm:mb-6">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-burgundy-600" />
                <span className="text-base sm:text-lg font-condensed font-bold text-gray-100 uppercase tracking-wide">
                  RESTRICTED AREA
                </span>
              </div>
              
              <p className="text-gray-300 font-condensed leading-relaxed mb-4 sm:mb-6 text-sm sm:text-base">
                You do not have the required administrator privileges to access this area. 
                This section is restricted to users with admin roles only.
              </p>
              
              <div className="bg-coal-900 border border-asphalt-600 p-3 sm:p-4 mb-4 sm:mb-6">
                <h3 className="text-xs sm:text-sm font-condensed font-bold text-gray-100 uppercase tracking-wide mb-2">
                  Your Current Access Level
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="bg-blue-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-wide">
                    USER
                  </span>
                  <span className="text-gray-400 text-xs sm:text-sm font-condensed">
                    Standard user privileges
                  </span>
                </div>
              </div>
              
              <p className="text-gray-500 text-xs sm:text-sm font-condensed uppercase tracking-wide">
                If you believe you should have admin access, please contact the system administrator.
              </p>
            </div>
            
            {/* Action Buttons - Stack on mobile */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mt-8">
              {/* Clickable Logo */}
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                title="BACK TO HOME"
              >
                <div className="text-xl sm:text-2xl mr-2">🎸</div>
                <div className="text-base sm:text-lg font-industrial text-gray-100 tracking-wide uppercase">
                  PROGDEALER
                </div>
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full sm:w-auto bg-industrial-green-600 border-2 border-industrial-green-600 text-white px-6 sm:px-8 py-3 uppercase tracking-wide font-condensed font-bold hover:bg-industrial-green-700 hover:border-industrial-green-700 transition-all duration-200 text-sm"
              >
                RETURN TO MAIN SITE
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
}
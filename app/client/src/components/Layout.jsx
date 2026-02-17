import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { auth } from '../api';
import NotificationDropdown from './NotificationDropdown';
import LanguageToggle from './LanguageToggle';
import MobileBottomNav from './MobileBottomNav';
import OfflineBanner from './OfflineBanner';
import DarkModeToggle from './DarkModeToggle';
import BackToTop from './BackToTop';
import ChatWidget from './ChatWidget';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export default function Layout() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Enable keyboard shortcuts
  useKeyboardShortcuts({
    onEscape: () => setMobileMenuOpen(false),
  });

  // Refresh user data on mount
  useState(() => {
    if (isAuthenticated) {
      auth.getMe()
        .then(userData => updateUser(userData))
        .catch(() => logout());
    }
  }, []);

  const handleLogout = () => {
    auth.logout();
    logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    return `/dashboard/${user.role}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-16 md:pb-0">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400"
      >
        Skip to main content
      </a>

      {/* Offline Banner */}
      <OfflineBanner />
      
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center">
                <span className="text-2xl font-bold text-primary-600">WantokJobs</span>
              </Link>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                <Link to="/jobs" className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-primary-600">
                  Find Jobs
                </Link>
                <Link to="/companies" className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-primary-600">
                  Companies
                </Link>
                <Link to="/training" className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-primary-600">
                  Training
                </Link>
              </div>
            </div>
            
            <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
              <DarkModeToggle />
              {user ? (
                <>
                  <NotificationDropdown />
                  <Link
                    to={getDashboardLink()}
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                  <span className="text-gray-700 dark:text-gray-300">{user.name}</span>
                  <button
                    onClick={handleLogout}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium dark:text-gray-300"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button - enhanced touch target */}
            <div className="flex items-center sm:hidden">
              {user && <NotificationDropdown />}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-3 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 active:bg-gray-200"
                aria-label="Toggle mobile menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu - enhanced touch targets (min 44px) */}
          {mobileMenuOpen && (
            <div className="sm:hidden py-3 border-t border-gray-100">
              <Link 
                to="/jobs" 
                className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 min-h-[44px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                🔍 Find Jobs
              </Link>
              <Link 
                to="/companies" 
                className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 min-h-[44px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                🏢 Companies
              </Link>
              <Link 
                to="/training" 
                className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 min-h-[44px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                📚 Training
              </Link>
              <Link 
                to="/about" 
                className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 min-h-[44px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                ℹ️ About
              </Link>
              {user ? (
                <>
                  <div className="border-t border-gray-100 my-2"></div>
                  <div className="px-4 py-2 text-sm text-gray-600">
                    Signed in as <strong>{user.name}</strong>
                  </div>
                  <Link 
                    to={getDashboardLink()} 
                    className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 min-h-[44px] flex items-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    📊 Dashboard
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="block w-full text-left px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 active:bg-red-100 min-h-[44px] flex items-center"
                  >
                    🚪 Logout
                  </button>
                </>
              ) : (
                <>
                  <div className="border-t border-gray-100 my-2"></div>
                  <Link 
                    to="/login" 
                    className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 min-h-[44px] flex items-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    🔐 Login
                  </Link>
                  <Link 
                    to="/register" 
                    className="block mx-4 my-2 px-4 py-3 text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800 rounded-lg text-center min-h-[44px] flex items-center justify-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    ✨ Sign Up Free
                  </Link>
                </>
              )}
            </div>
          )}
        </nav>
      </header>

      {/* Main content */}
      <main id="main-content" className="flex-grow">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Back to top button */}
      <BackToTop />

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-12" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">WantokJobs</h3>
              <p className="text-gray-400">
                Connecting talent with opportunity across the Pacific region.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/jobs" className="text-gray-400 hover:text-white">Browse Jobs</Link></li>
                <li><Link to="/companies" className="text-gray-400 hover:text-white">Companies</Link></li>
                <li><Link to="/training" className="text-gray-400 hover:text-white">Training & Courses</Link></li>
                <li><Link to="/about" className="text-gray-400 hover:text-white">About Us</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Contact</h3>
              <p className="text-gray-400">Email: info@wantokjobs.com</p>
              <p className="text-gray-400">Phone: +675 7583 0582</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
            <p>&copy; 2026 WantokJobs. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Jean AI Chat Widget */}
      <ChatWidget />
    </div>
  );
}

import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../api';
import NotificationDropdown from './NotificationDropdown';

export default function Layout() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center">
                <span className="text-2xl font-bold text-primary-600">WantokJobs</span>
              </Link>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                <Link to="/jobs" className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-primary-600">
                  Find Jobs
                </Link>
                <Link to="/about" className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-primary-600">
                  About
                </Link>
              </div>
            </div>
            
            <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
              {user ? (
                <>
                  <NotificationDropdown />
                  <Link
                    to={getDashboardLink()}
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                  <span className="text-gray-700">{user.name}</span>
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
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
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

            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden pb-3">
              <Link to="/jobs" className="block px-3 py-2 text-gray-900 hover:bg-gray-50">
                Find Jobs
              </Link>
              <Link to="/about" className="block px-3 py-2 text-gray-900 hover:bg-gray-50">
                About
              </Link>
              {user ? (
                <>
                  <Link to={getDashboardLink()} className="block px-3 py-2 text-gray-900 hover:bg-gray-50">
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-gray-900 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block px-3 py-2 text-gray-900 hover:bg-gray-50">
                    Login
                  </Link>
                  <Link to="/register" className="block px-3 py-2 text-gray-900 hover:bg-gray-50">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          )}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-12">
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
    </div>
  );
}

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
import { CompareFloatingBar } from './JobCard';
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
                  {t('nav.findJobs')}
                </Link>
                <Link to="/companies" className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-primary-600">
                  {t('nav.companies')}
                </Link>
                <Link to="/training" className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-primary-600">
                  {t('nav.training')}
                </Link>
                <div className="relative group">
                  <button className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-primary-600">
                    Tools ▾
                  </button>
                  <div className="absolute left-0 top-full mt-0 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <Link to="/salary-calculator" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                      🧮 Salary Calculator
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
              <LanguageToggle variant="compact" />
              <DarkModeToggle />
              {user ? (
                <>
                  <NotificationDropdown />
                  <Link
                    to={getDashboardLink()}
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <span className="text-gray-700 dark:text-gray-300">{user.name}</span>
                  <button
                    onClick={handleLogout}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                  >
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium dark:text-gray-300"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to="/register"
                    className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                  >
                    {t('nav.register')}
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
            <div className="sm:hidden py-3 border-t border-gray-100 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-3 px-4 py-2 mb-2">
                <LanguageToggle variant="compact" />
                <DarkModeToggle />
              </div>
              <Link 
                to="/jobs" 
                className="block px-4 py-3 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 min-h-[44px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                🔍 {t('nav.findJobs')}
              </Link>
              <Link 
                to="/companies" 
                className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 min-h-[44px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                🏢 {t('nav.companies')}
              </Link>
              <Link 
                to="/training" 
                className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 min-h-[44px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                📚 {t('nav.training')}
              </Link>
              <Link 
                to="/about" 
                className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 min-h-[44px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                ℹ️ {t('nav.about')}
              </Link>
              {user ? (
                <>
                  <div className="border-t border-gray-100 my-2"></div>
                  <div className="px-4 py-2 text-sm text-gray-600">
                    {t('nav.signedInAs')} <strong>{user.name}</strong>
                  </div>
                  <Link 
                    to={getDashboardLink()} 
                    className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 min-h-[44px] flex items-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    📊 {t('nav.dashboard')}
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="block w-full text-left px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 active:bg-red-100 min-h-[44px] flex items-center"
                  >
                    🚪 {t('nav.logout')}
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
                    🔐 {t('nav.login')}
                  </Link>
                  <Link 
                    to="/register" 
                    className="block mx-4 my-2 px-4 py-3 text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800 rounded-lg text-center min-h-[44px] flex items-center justify-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    ✨ {t('nav.registerFree')}
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
      <CompareFloatingBar />

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-12" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">WantokJobs</h3>
              <p className="text-gray-400">
                {t('footer.tagline')}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">{t('footer.quickLinks')}</h3>
              <ul className="space-y-2">
                <li><Link to="/jobs" className="text-gray-400 hover:text-white">{t('footer.browseJobs')}</Link></li>
                <li><Link to="/companies" className="text-gray-400 hover:text-white">{t('footer.companies')}</Link></li>
                <li><Link to="/training" className="text-gray-400 hover:text-white">{t('footer.training')}</Link></li>
                <li><Link to="/about" className="text-gray-400 hover:text-white">{t('footer.aboutUs')}</Link></li>
                <li><Link to="/success-stories" className="text-gray-400 hover:text-white">Success Stories</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Industries</h3>
              <ul className="space-y-2">
                <li><Link to="/industries/mining" className="text-gray-400 hover:text-white">Mining & Resources</Link></li>
                <li><Link to="/industries/construction" className="text-gray-400 hover:text-white">Construction</Link></li>
                <li><Link to="/industries/banking" className="text-gray-400 hover:text-white">Banking & Finance</Link></li>
                <li><Link to="/industries/health" className="text-gray-400 hover:text-white">Health & Medical</Link></li>
                <li><Link to="/industries/technology" className="text-gray-400 hover:text-white">IT & Technology</Link></li>
                <li><Link to="/industries/oil-gas" className="text-gray-400 hover:text-white">Oil & Gas</Link></li>
                <li><Link to="/industries/government" className="text-gray-400 hover:text-white">Government</Link></li>
                <li><Link to="/industries/education" className="text-gray-400 hover:text-white">Education</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">{t('footer.contact')}</h3>
              <p className="text-gray-400">Email: info@wantokjobs.com</p>
              <p className="text-gray-400">Phone: +675 7583 0582</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
            <p>{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>

      {/* Jean AI Chat Widget */}
      <ChatWidget />
    </div>
  );
}

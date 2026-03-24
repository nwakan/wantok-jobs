import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
import CookieConsent from './CookieConsent';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import JeanContactLinks from './JeanContactLinks';

function getDashboardLink(user) {
  if (!user) return '/';
  const roleRoutes = {
    'jobseeker': '/jobseeker/overview',
    'employer': '/employer/overview',
    'recruiter': '/recruiter/overview',
    'trainer': '/trainer/overview',
    'agency': '/agency/overview',
    'admin': '/admin/overview'
  };
  return roleRoutes[user.role] || roleRoutes[user.account_type] || '/';
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useKeyboardShortcuts({
    onEscape: () => setMobileMenuOpen(false),
  });

  useEffect(() => {
    if (isAuthenticated) {
      auth.getMe()
        .then(userData => updateUser(userData))
        .catch(() => logout());
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    auth.logout();
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <OfflineBanner />
      
      <header className={`sticky top-0 z-50 bg-white dark:bg-gray-900 transition-shadow duration-300 ${scrolled ? 'shadow-lg' : 'border-b border-gray-200 dark:border-gray-700'}`}>
        <nav className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center">
            <img src="/assets/logo.png" alt="WantokJobs Logo" className="h-12 w-auto opacity-90 hover:opacity-100 transition-opacity" />
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            <Link to="/jobs" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/jobs') ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              💼 {t('nav.jobs') || 'Jobs'}
            </Link>
            <Link to="/employers" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/employers') ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              🏢 {t('nav.companies') || 'Employers'}
            </Link>
            <Link to="/training" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/training') ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              🎓 {t('nav.training') || 'Training'}
            </Link>
            <Link to="/about" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/about') ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              ℹ️ {t('nav.about') || 'About'}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <DarkModeToggle />
            <NotificationDropdown />
            
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('nav.signedInAs')} <strong className="text-gray-900 dark:text-white">{user.name}</strong>
                </span>
                <Link to={getDashboardLink(user)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  📊 {t('nav.dashboard')}
                </Link>
                <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                  🚪 {t('nav.logout')}
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  🔐 {t('nav.login')}
                </Link>
                <Link to="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  {t('nav.register')}
                </Link>
              </div>
            )}

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </nav>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="px-4 py-3 space-y-2">
              <Link to="/jobs" className="block px-4 py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>💼 Jobs</Link>
              <Link to="/employers" className="block px-4 py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>🏢 Employers</Link>
              <Link to="/training" className="block px-4 py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>🎓 Training</Link>
              <Link to="/about" className="block px-4 py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>ℹ️ About</Link>
            </div>
          </div>
        )}
      </header>

      <main className="min-h-screen">
        <Outlet />
      </main>

      <footer className="bg-gray-900 text-gray-200 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <Link to="/">
                <img src="/assets/logo.png" alt="WantokJobs" className="h-12 brightness-0 invert mb-4" />
              </Link>
              <p className="text-gray-400 text-sm">{t('footer.tagline')}</p>
            </div>
            <div>
              <h3 className="font-bold mb-4">{t('footer.quickLinks')}</h3>
              <ul className="space-y-2">
                <li><Link to="/jobs" className="text-gray-400 hover:text-white">{t('footer.browseJobs')}</Link></li>
                <li><Link to="/employers" className="text-gray-400 hover:text-white">{t('footer.companies')}</Link></li>
                <li><Link to="/about" className="text-gray-400 hover:text-white">{t('footer.aboutUs')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link to="/privacy" className="text-gray-400 hover:text-white">Privacy</Link></li>
                <li><Link to="/terms" className="text-gray-400 hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      <MobileBottomNav />
      <CompareFloatingBar />
      <BackToTop />
      <ChatWidget />
      <JeanContactLinks />
      <CookieConsent />
    </>
  );
}

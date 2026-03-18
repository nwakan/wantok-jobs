import { Outlet, Link, useNavigate } from 'react-router-dom';
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
import JeanMobileSheet from './JeanMobileSheet';

export default function Layout() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleLogout = () => {
    auth.logout();
    logout();
    navigate('/');
  };

  return (
    <>
      <OfflineBanner />
      <header className="header">
        <nav className="flex items-center justify-between p-4">
          <Link to="/">
            <img src="/assets/logo.png" alt="WantokJobs Logo" style={{ height: '48px', width: 'auto', opacity: 0.92 }} />
          </Link>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <DarkModeToggle />
            <NotificationDropdown />
            {user ? (
              <>
                <span className="px-2 text-gray-700 text-sm">{t('nav.signedInAs')} <strong>{user.name}</strong></span>
                <Link to={getDashboardLink()} className="btn btn-primary">📊 {t('nav.dashboard')}</Link>
                <button onClick={handleLogout} className="btn btn-danger ml-2">🚪 {t('nav.logout')}</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary">🔐 {t('nav.login')}</Link>
                <Link to="/register" className="btn btn-primary ml-2">{t('nav.register')}</Link>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="container mx-auto px-4 pb-12">
        <Outlet />
      </main>
      <footer className="bg-gray-900 text-gray-200 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold mb-4">WantokJobs</h3>
            <p className="text-gray-400">{t('footer.tagline')}</p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2">
              <li><Link to="/jobs" className="text-gray-400 hover:text-white">{t('footer.browseJobs')}</Link></li>
              <li><Link to="/companies" className="text-gray-400 hover:text-white">{t('footer.companies')}</Link></li>
              <li><Link to="/categories" className="text-gray-400 hover:text-white">📂 Categories</Link></li>
              <li><Link to="/transparency" className="text-gray-400 hover:text-white">🛡️ Transparency</Link></li>
              <li><Link to="/pricing" className="text-gray-400 hover:text-white">💰 Pricing</Link></li>
              <li><Link to="/blog" className="text-gray-400 hover:text-white">📰 Blog</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-gray-400 hover:text-white">{t('footer.aboutUs')}</Link></li>
              <li><Link to="/help" className="text-gray-400 hover:text-white">❓ Help Center</Link></li>
              <li><Link to="/faq" className="text-gray-400 hover:text-white">📋 FAQ</Link></li>
              <li><Link to="/success-stories" className="text-gray-400 hover:text-white">⭐ Success Stories</Link></li>
              <li><Link to="/features" className="text-gray-400 hover:text-white">💡 Feature Requests</Link></li>
              <li><Link to="/salary-calculator" className="text-gray-400 hover:text-white">🧮 Salary Calculator</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-white">✉️ Contact Us</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
          <p>{t('footer.copyright')}</p>
        </div>
      </footer>
      <JeanMobileSheet />
      <ChatWidget />
      <MobileBottomNav />
      <CookieConsent />
      <BackToTop />
      <CompareFloatingBar />
    </>
  );
}

function getDashboardLink() {
  // Place actual dashboard URL resolver here
  return '/dashboard';
}

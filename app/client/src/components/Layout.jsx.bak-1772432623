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
import CookieConsent from './CookieConsent';
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
                <Link to="/transparency" className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-primary-600">
                  <span className="mr-1">🛡️</span> Transparency
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
                to="/transparency" 
                className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 min-h-[44px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                🛡️ Transparency
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
              <Link 
                to="/help" 
                className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 min-h-[44px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                ❓ Help Center
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8">
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
              <p className="text-gray-400 mb-2">Email: info@wantokjobs.com</p>
              <p className="text-gray-400 mb-4">Phone: +675 7583 0582</p>
              <div className="flex gap-3 mt-3">
                <a href="https://wa.me/67575830582" target="_blank" rel="noopener" className="text-gray-400 hover:text-green-400" title="WhatsApp">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.09.547 4.058 1.504 5.772L0 24l6.396-1.467A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.94 0-3.76-.55-5.304-1.5l-.38-.226-3.795.87.91-3.666-.248-.395A9.953 9.953 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                </a>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <Link to="/privacy" className="text-gray-500 hover:text-gray-300 text-xs mr-4">Privacy Policy</Link>
                <Link to="/terms" className="text-gray-500 hover:text-gray-300 text-xs">Terms of Service</Link>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
            <p>{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>

      {/* Jean AI Chat Widget */}
      <ChatWidget />

      {/* Cookie Consent Banner */}
      <CookieConsent />
    </div>
  );
}

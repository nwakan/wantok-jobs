import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, Bell, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Hide on desktop
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  if (!isMobile && typeof window !== 'undefined') {
    return null;
  }

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    {
      path: '/',
      icon: Home,
      label: t('nav.home'),
      exact: true
    },
    {
      path: '/jobs',
      icon: Search,
      label: t('nav.search')
    },
    {
      path: user?.role === 'employer' ? '/dashboard/employer/post-job' : '/register',
      icon: PlusCircle,
      label: t('nav.postJob'),
      highlight: true
    },
    {
      path: user ? `/dashboard/${user.role}` : '/login',
      icon: Bell,
      label: t('nav.notifications'),
      requiresAuth: true
    },
    {
      path: user ? `/dashboard/${user.role}/profile` : '/login',
      icon: User,
      label: t('nav.profile')
    }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.exact 
            ? location.pathname === item.path
            : isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-[56px] transition-colors ${
                active 
                  ? 'text-primary-600' 
                  : 'text-gray-600 hover:text-gray-900'
              } ${item.highlight ? 'relative' : ''}`}
            >
              {item.highlight && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary-600 rounded-full p-3 shadow-lg">
                    <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                </div>
              )}
              {!item.highlight && (
                <>
                  <Icon 
                    className={`w-6 h-6 mb-1 ${active ? 'fill-current' : ''}`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <span className={`text-xs font-medium ${active ? 'font-semibold' : ''}`}>
                    {item.label}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

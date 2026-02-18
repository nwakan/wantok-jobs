import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Briefcase, Users, Building2, Flag, 
  TrendingUp, MessageSquare, Lightbulb, BarChart3, Settings,
  ChevronLeft, ChevronRight, LogOut, Shield, Menu, X
} from 'lucide-react';

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  const navItems = [
    { 
      name: 'Dashboard', 
      path: '/dashboard/admin', 
      icon: LayoutDashboard,
      exact: true 
    },
    { 
      name: 'Jobs Management', 
      path: '/dashboard/admin/jobs', 
      icon: Briefcase 
    },
    { 
      name: 'Employers', 
      path: '/dashboard/admin/users', 
      icon: Building2,
      badge: 'Users'
    },
    { 
      name: 'Transparency', 
      path: '/dashboard/admin/reports', 
      icon: Flag,
      submenu: [
        { name: 'Flags & Reports', path: '/dashboard/admin/reports' },
        { name: 'Reviews', path: '/dashboard/admin/reviews' },
      ]
    },
    { 
      name: 'Marketing', 
      path: '/dashboard/admin/marketing', 
      icon: TrendingUp,
      submenu: [
        { name: 'Marketing Posts', path: '/dashboard/admin/marketing' },
        { name: 'Newsletter', path: '/dashboard/admin/newsletter' },
        { name: 'Banners', path: '/dashboard/admin/banners' },
        { name: 'Articles', path: '/dashboard/admin/articles' },
      ]
    },
    { 
      name: 'Feature Requests', 
      path: '/dashboard/admin/feature-requests', 
      icon: Lightbulb 
    },
    { 
      name: 'Analytics', 
      path: '/dashboard/admin/analytics', 
      icon: BarChart3 
    },
    { 
      name: 'Employer Claims', 
      path: '/dashboard/admin/employer-claims', 
      icon: Shield 
    },
    { 
      name: 'Messages', 
      path: '/dashboard/admin/messages', 
      icon: MessageSquare,
      submenu: [
        { name: 'Platform Messages', path: '/dashboard/admin/messages' },
        { name: 'Contact Form', path: '/dashboard/admin/contact-messages' },
      ]
    },
    { 
      name: 'Settings', 
      path: '/dashboard/admin/settings', 
      icon: Settings,
      submenu: [
        { name: 'General Settings', path: '/dashboard/admin/settings' },
        { name: 'Categories', path: '/dashboard/admin/categories' },
        { name: 'Plans & Pricing', path: '/dashboard/admin/plans' },
        { name: 'Orders & Billing', path: '/dashboard/admin/orders' },
        { name: 'Security', path: '/dashboard/admin/security' },
        { name: 'Rate Limits', path: '/dashboard/admin/rate-limits' },
        { name: 'AI Agents', path: '/dashboard/admin/ai-agents' },
        { name: 'Jean AI', path: '/dashboard/admin/jean' },
        { name: 'Wallet Admin', path: '/dashboard/admin/wallet' },
      ]
    },
  ];

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  const NavItem = ({ item }) => {
    const active = isActive(item);
    const Icon = item.icon;
    const [submenuOpen, setSubmenuOpen] = useState(active);

    if (item.submenu) {
      return (
        <div className="mb-1">
          <button
            onClick={() => setSubmenuOpen(!submenuOpen)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
              active
                ? 'bg-primary-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
            </div>
            {!collapsed && (
              <ChevronRight className={`w-4 h-4 transition-transform ${submenuOpen ? 'rotate-90' : ''}`} />
            )}
          </button>
          {!collapsed && submenuOpen && (
            <div className="ml-8 mt-1 space-y-1">
              {item.submenu.map((subItem) => (
                <Link
                  key={subItem.path}
                  to={subItem.path}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    location.pathname === subItem.path
                      ? 'bg-primary-600/50 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {subItem.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        to={item.path}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
          active
            ? 'bg-primary-600 text-white'
            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        }`}
        title={collapsed ? item.name : ''}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
        {!collapsed && item.badge && (
          <span className="ml-auto text-xs px-2 py-0.5 bg-gray-700 rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary-500" />
            <span className="text-white font-semibold">Admin Portal</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-gray-300 hover:text-white"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gray-800 border-r border-gray-700 transition-all duration-300 z-40
          ${collapsed ? 'w-20' : 'w-72'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary-500" />
              <span className="text-white font-semibold text-lg">Admin Portal</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-700 p-4">
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-700 rounded-lg">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Content */}
      <main
        className={`transition-all duration-300 pt-16 lg:pt-0 ${
          collapsed ? 'lg:ml-20' : 'lg:ml-72'
        }`}
      >
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

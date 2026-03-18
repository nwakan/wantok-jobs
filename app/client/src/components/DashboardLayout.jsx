import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout({ role, children }) {
  const location = useLocation();
  const { user } = useAuth();

  const jobseekerNav = [
    { name: 'Overview', path: '/dashboard/jobseeker', icon: '📊' },
    { name: 'My Applications', path: '/dashboard/jobseeker/applications', icon: '📝' },
    { name: 'Saved Jobs', path: '/dashboard/jobseeker/saved', icon: '💾' },
    { name: 'Job Alerts', path: '/dashboard/jobseeker/job-alerts', icon: '🔔' },
    { name: 'Saved Searches', path: '/dashboard/jobseeker/saved-searches', icon: '🔍' },
    { name: 'Followed Companies', path: '/dashboard/jobseeker/followed-companies', icon: '🏢' },
    { name: 'Recommendations', path: '/dashboard/jobseeker/recommendations', icon: '✨' },
    { name: 'Analytics', path: '/dashboard/jobseeker/analytics', icon: '📈' },
    { name: 'Wallet', path: '/dashboard/jobseeker/wallet', icon: '💰' },
    { name: 'Messages', path: '/dashboard/jobseeker/messages', icon: '💬' },
    { name: 'Resume Builder', path: '/dashboard/jobseeker/resume-builder', icon: '📄' },
    { name: 'My Profile', path: '/dashboard/jobseeker/profile', icon: '👤' },
    { name: 'Settings', path: '/dashboard/jobseeker/settings', icon: '⚙️' },
    { name: 'Change Password', path: '/dashboard/jobseeker/change-password', icon: '🔒' },
    { name: '2FA Security', path: '/dashboard/jobseeker/2fa', icon: '🛡️' },
  ];

  const employerNav = [
    { name: 'Overview', path: '/dashboard/employer', icon: '📊' },
    { name: 'My Jobs', path: '/dashboard/employer/jobs', icon: '💼' },
    { name: 'Post a Job', path: '/dashboard/employer/post-job', icon: '➕' },
    ...(user?.account_type === 'agency' ? [{ name: 'Clients', path: '/dashboard/employer/clients', icon: '🏢' }] : []),
    { name: 'Applicants', path: '/dashboard/employer/applicants', icon: '📋' },
    { name: 'Candidate Search', path: '/dashboard/employer/candidate-search', icon: '🔍' },
    { name: 'Saved Candidates', path: '/dashboard/employer/saved-candidates', icon: '⭐' },
    { name: 'Analytics', path: '/dashboard/employer/analytics', icon: '📈' },
    { name: 'Orders & Billing', path: '/dashboard/employer/orders-billing', icon: '💳' },
    { name: 'Wallet', path: '/dashboard/employer/wallet', icon: '💰' },
    { name: 'Company Profile', path: '/dashboard/employer/profile', icon: '🏢' },
    { name: 'Messages', path: '/dashboard/employer/messages', icon: '💬' },
    { name: 'Change Password', path: '/dashboard/employer/change-password', icon: '🔒' },
    { name: '2FA Security', path: '/dashboard/employer/2fa', icon: '🛡️' },
  ];

  const adminNav = [
    { name: 'Overview', path: '/dashboard/admin', icon: '📊' },
    { name: 'Users', path: '/dashboard/admin/users', icon: '👥' },
    { name: 'Jobs', path: '/dashboard/admin/jobs', icon: '💼' },
    { name: 'Orders', path: '/dashboard/admin/orders', icon: '🛒' },
    { name: 'Plans', path: '/dashboard/admin/plans', icon: '📦' },
    { name: 'Categories', path: '/dashboard/admin/categories', icon: '🏷️' },
    { name: 'Reviews', path: '/dashboard/admin/reviews', icon: '⭐' },
    { name: 'Reports', path: '/dashboard/admin/reports', icon: '📈' },
    { name: 'Banners', path: '/dashboard/admin/banners', icon: '🎯' },
    { name: 'Articles', path: '/dashboard/admin/articles', icon: '📰' },
    { name: 'Messages', path: '/dashboard/admin/messages', icon: '💬' },
    { name: 'Contact Messages', path: '/dashboard/admin/contact-messages', icon: '📧' },
    { name: 'AI Agents', path: '/dashboard/admin/ai-agents', icon: '🤖' },
    { name: 'Jean AI', path: '/dashboard/admin/jean', icon: '🧠' },
    { name: 'Security', path: '/dashboard/admin/security', icon: '🔐' },
    { name: 'Rate Limits', path: '/dashboard/admin/rate-limits', icon: '🛡️' },
    { name: 'Wallet Admin', path: '/dashboard/admin/wallet', icon: '💰' },
    { name: 'Payment Management', path: '/dashboard/admin/payments', icon: '💳' },
    { name: 'Settings', path: '/dashboard/admin/settings', icon: '⚙️' },
    { name: 'Change Password', path: '/dashboard/admin/change-password', icon: '🔒' },
    { name: '2FA Security', path: '/dashboard/admin/2fa', icon: '🛡️' },
  ];

  const navItems = role === 'jobseeker' ? jobseekerNav : role === 'employer' ? employerNav : adminNav;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold mb-4 capitalize text-gray-900 dark:text-gray-100">{role} Dashboard</h2>
            <ul className="space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                        isActive
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

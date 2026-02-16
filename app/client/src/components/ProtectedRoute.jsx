import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../api';
import DashboardLayout from './DashboardLayout';

export default function ProtectedRoute({ role }) {
  const { user, isAuthenticated, updateUser, logout, loading: authLoading } = useAuth();
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    auth.getMe()
      .then(userData => {
        updateUser(userData);
        setVerified(true);
        setLoading(false);
      })
      .catch(() => {
        logout();
        setLoading(false);
      });
  }, [authLoading]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return (
    <DashboardLayout role={user.role}>
      <Outlet />
    </DashboardLayout>
  );
}

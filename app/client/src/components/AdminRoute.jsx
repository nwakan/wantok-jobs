import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminLayout from './AdminLayout';

export default function AdminRoute() {
  const { user, isAuthenticated, updateUser, logout, loading: authLoading } = useAuth();
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    // Verify user is still authenticated and is admin
    const verifyAdmin = async () => {
      try {
        const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/admin/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Verification failed');
        }

        const userData = await response.json();
        updateUser(userData);
        setVerified(true);
        setLoading(false);
      } catch (error) {
        logout();
        setLoading(false);
      }
    };

    verifyAdmin();
  }, [authLoading, isAuthenticated]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/admin" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

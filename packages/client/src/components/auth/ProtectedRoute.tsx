import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';


export default function ProtectedRoute({ allowedRoles }) {

  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ color: 'white', textAlign: 'center', marginTop: '20%' }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
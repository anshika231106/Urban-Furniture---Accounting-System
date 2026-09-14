import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard component.
 * Wraps child routes requiring authentication and optional role restrictions.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The protected content
 * @param {string[]} [props.allowedRoles] - If provided, only these roles can access
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading" id="auth-loading">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Contact users belong in /portal, not the main app
    if (user.role === 'Contact') {
      return <Navigate to="/portal" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}

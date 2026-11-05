import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';

export default function AccessDeniedPage() {
  const navigate = useNavigate();
  const { user, handleLogout } = useAuth();

  const handleDashboard = () => {
    if (user?.role === 'admin') navigate('/admin/dashboard');
    else if (user?.role === 'teamleader') navigate('/teamleader/dashboard');
    else if (user?.role === 'intern') navigate('/intern/dashboard');
    else navigate('/login');
  };

  const handleSwitchAccount = () => {
    handleLogout();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #0f172a)',
      color: 'var(--text-primary, #f8fafc)',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        background: 'var(--bg-secondary, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '16px',
        padding: '36px',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
        <span style={{
          display: 'inline-block',
          padding: '4px 12px',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          marginBottom: '12px'
        }}>
          ERROR 403
        </span>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 12px 0' }}>
          Access Denied
        </h1>
        <p style={{
          fontSize: '0.925rem',
          color: 'var(--text-secondary, #94a3b8)',
          lineHeight: 1.5,
          margin: '0 0 24px 0'
        }}>
          You do not have the required permissions to access this page or perform this action.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={handleDashboard}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'var(--accent, #6366f1)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Go to Dashboard
          </button>
          <button
            type="button"
            onClick={handleSwitchAccount}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'transparent',
              color: 'var(--text-primary, #f8fafc)',
              border: '1px solid var(--border-color, #334155)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

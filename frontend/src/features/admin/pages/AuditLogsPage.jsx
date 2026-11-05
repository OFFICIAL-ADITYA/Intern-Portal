import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import useAuditLogs from '../hooks/useAuditLogs';
import AuditLogFilters from '../components/AuditLogFilters';
import AuditLogTable from '../components/AuditLogTable';
import NotificationBell from '../../../shared/components/NotificationBell';
import './AuditLogsPage.css';

export default function AuditLogsPage() {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();

  const {
    logs,
    totalPages,
    total,
    loading,
    error,
    exporting,
    filters,
    updateFilters,
    setPage,
    clearFilters,
    handleExport,
    retry,
  } = useAuditLogs();

  const initials = (user?.fullName || 'Admin')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const logout = () => {
    handleLogout();
    navigate('/login');
  };

  return (
    <div className="audit-page-shell">
      {/* Top Header */}
      <header className="audit-topbar">
        <div className="audit-brand" onClick={() => navigate('/admin/dashboard')} style={{ cursor: 'pointer' }}>
          <span className="audit-brand-icon">UP</span>
          <strong>uptoskills</strong>
          <span className="audit-brand-tag">Audit Trail</span>
        </div>

        <div className="audit-topbar-actions">
          <button
            type="button"
            className="audit-nav-back-btn"
            onClick={() => navigate('/admin/dashboard')}
          >
            ← Back to Dashboard
          </button>

          <NotificationBell userRole="admin" />

          <div className="audit-user-info">
            <div className="audit-avatar">{initials}</div>
            <div className="audit-user-text">
              <strong>{user?.fullName || 'Administrator'}</strong>
              <small>{user?.email || 'admin@uptoskills.com'}</small>
            </div>
            <button
              type="button"
              className="audit-logout-btn"
              onClick={logout}
              title="Sign out"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="audit-main-content">
        <div className="audit-header-section">
          <p className="audit-eyebrow">GOVERNANCE & ACCOUNTABILITY</p>
          <div className="audit-title-row">
            <div>
              <h1>Audit Logs</h1>
              <p className="audit-subtitle">
                Immutable chronological trail of portal logins, certificate decisions, template updates, and automated retention jobs.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <AuditLogFilters
          filters={filters}
          onUpdateFilters={updateFilters}
          onClearFilters={clearFilters}
          onExport={handleExport}
          exporting={exporting}
          total={total}
        />

        {/* Logs Table */}
        <AuditLogTable
          logs={logs}
          loading={loading}
          error={error}
          onRetry={retry}
          page={filters.page}
          limit={filters.limit}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          onLimitChange={(newLimit) => updateFilters({ limit: newLimit })}
        />
      </main>
    </div>
  );
}

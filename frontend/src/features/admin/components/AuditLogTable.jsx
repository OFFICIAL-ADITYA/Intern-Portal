import React, { useState } from 'react';

function formatRelativeTime(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

function getActionBadgeClass(action = '') {
  const upper = action.toUpperCase();

  if (
    upper.includes('REJECT') ||
    upper.includes('REVOKE') ||
    upper.includes('FAILED') ||
    upper.includes('PURGE')
  ) {
    return 'badge-danger';
  }

  if (
    upper.includes('APPROVE') ||
    upper.includes('FINALIZED') ||
    upper.includes('RESTORE') ||
    upper === 'USER_CREATED' ||
    upper === 'LOGIN'
  ) {
    return 'badge-success';
  }

  if (
    upper.includes('SUBMIT') ||
    upper.includes('FORWARD') ||
    upper.includes('DRAFT') ||
    upper === 'EXPORT'
  ) {
    return 'badge-info';
  }

  return 'badge-warning';
}

function getRoleBadgeClass(role = '') {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'role-badge-admin';
    case 'teamleader':
      return 'role-badge-tl';
    case 'intern':
      return 'role-badge-intern';
    case 'system':
    default:
      return 'role-badge-system';
  }
}

export default function AuditLogTable({
  logs = [],
  loading = false,
  error = null,
  onRetry,
  page = 1,
  limit = 20,
  totalPages = 1,
  total = 0,
  onPageChange,
  onLimitChange,
}) {
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Skeleton rows for loading state
  if (loading) {
    return (
      <div className="audit-table-wrapper">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>IP Address</th>
              <th>Meta</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(6)].map((_, idx) => (
              <tr key={idx} className="audit-skeleton-row">
                <td><div className="skeleton-bar" style={{ width: '80px' }} /></td>
                <td><div className="skeleton-bar" style={{ width: '130px' }} /></td>
                <td><div className="skeleton-bar" style={{ width: '110px' }} /></td>
                <td><div className="skeleton-bar" style={{ width: '90px' }} /></td>
                <td><div className="skeleton-bar" style={{ width: '100px' }} /></td>
                <td><div className="skeleton-bar" style={{ width: '50px' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="audit-state-card audit-error-state">
        <div className="audit-state-icon">⚠️</div>
        <h3>Failed to Load Audit Logs</h3>
        <p>{error}</p>
        {onRetry && (
          <button type="button" className="audit-btn-retry" onClick={onRetry}>
            ↻ Try Again
          </button>
        )}
      </div>
    );
  }

  // Empty state
  if (!logs.length) {
    return (
      <div className="audit-state-card audit-empty-state">
        <div className="audit-state-icon">🔍</div>
        <h3>No activity for this filter</h3>
        <p>No audit log events match your current filter parameters.</p>
      </div>
    );
  }

  return (
    <div className="audit-table-container">
      <div className="audit-table-wrapper">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>IP Address</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const isExpanded = expandedRows.has(log._id);
              const actorName =
                log.actorId?.fullName ||
                (log.actorRole === 'system' ? 'System Job' : log.actorRole || 'Unknown');
              const actorRole = log.actorRole || log.actorId?.role || 'system';
              const actorEmail = log.actorId?.email;

              const exactTime = log.createdAt
                ? new Date(log.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                  })
                : '—';

              const hasMeta = log.meta && Object.keys(log.meta).length > 0;

              return (
                <React.Fragment key={log._id}>
                  <tr
                    className={`audit-table-row ${isExpanded ? 'row-expanded' : ''}`}
                    onClick={() => hasMeta && toggleRow(log._id)}
                    style={{ cursor: hasMeta ? 'pointer' : 'default' }}
                  >
                    {/* Time */}
                    <td className="audit-cell-time">
                      <span className="relative-time" title={exactTime}>
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </td>

                    {/* Actor */}
                    <td className="audit-cell-actor">
                      <div className="actor-info">
                        <strong className="actor-name">{actorName}</strong>
                        <div className="actor-sub">
                          <span className={`actor-role-badge ${getRoleBadgeClass(actorRole)}`}>
                            {actorRole}
                          </span>
                          {actorEmail && <small className="actor-email">{actorEmail}</small>}
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="audit-cell-action">
                      <span className={`action-badge ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Target */}
                    <td className="audit-cell-target">
                      {log.targetType ? (
                        <div className="target-info">
                          <span className="target-type">{log.targetType}</span>
                          {log.targetId && (
                            <small className="target-id" title={String(log.targetId)}>
                              {String(log.targetId).slice(-8)}
                            </small>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* IP */}
                    <td className="audit-cell-ip">
                      <code className="ip-badge">{log.ip || '—'}</code>
                    </td>

                    {/* Expand Button */}
                    <td className="audit-cell-meta" style={{ textAlign: 'center' }}>
                      {hasMeta ? (
                        <button
                          type="button"
                          className="audit-expand-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(log._id);
                          }}
                          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>

                  {/* Expandable JSON Row */}
                  {isExpanded && (
                    <tr className="audit-expand-row">
                      <td colSpan={6}>
                        <div className="audit-meta-preview">
                          <div className="audit-meta-header">
                            <span>Metadata Payload</span>
                            {log.userAgent && (
                              <span className="audit-user-agent" title={log.userAgent}>
                                UA: {log.userAgent}
                              </span>
                            )}
                          </div>
                          <pre className="audit-json-block">
                            <code>{JSON.stringify(log.meta, null, 2)}</code>
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="audit-pagination">
        <div className="audit-pagination-left">
          {onLimitChange && (
            <div className="audit-per-page">
              <label htmlFor="audit-rows-per-page">Rows per page:</label>
              <select
                id="audit-rows-per-page"
                className="audit-page-select"
                value={limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          )}
          {total > 0 && (
            <span className="audit-range-info">
              Showing <strong>{Math.min((page - 1) * limit + 1, total)}</strong>–<strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong>
            </span>
          )}
        </div>

        <div className="audit-pagination-right">
          <button
            type="button"
            className="audit-page-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            ← Previous
          </button>

          <span className="audit-page-info">
            Page <strong>{page}</strong> of <strong>{Math.max(totalPages, 1)}</strong>
          </span>

          <button
            type="button"
            className="audit-page-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

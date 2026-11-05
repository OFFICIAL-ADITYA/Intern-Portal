import React from 'react';

export const AGREED_ACTIONS = [
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'USER_CREATED',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'REQUEST_SUBMITTED',
  'REQUEST_FORWARDED',
  'REQUEST_REJECTED',
  'REQUEST_APPROVED',
  'CERTIFICATE_DRAFT_CREATED',
  'CERTIFICATE_EDITED',
  'CERTIFICATE_FINALIZED',
  'CERTIFICATE_REVOKED',
  'TEMPLATE_CREATED',
  'TEMPLATE_UPDATED',
  'TEMPLATE_TOGGLED',
  'RETENTION_POLICY_UPDATED',
  'INTERN_ARCHIVED',
  'INTERN_PURGED',
  'INTERN_RESTORED',
  'EXPORT',
];

export const TARGET_TYPES = [
  'user',
  'request',
  'certificate',
  'template',
  'retention_policy',
  'audit_log',
];

export default function AuditLogFilters({
  filters,
  onUpdateFilters,
  onClearFilters,
  onExport,
  exporting,
  total,
}) {
  const handlePreset = (presetKey) => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().slice(0, 10);

    let from = '';
    let to = formatDate(today);

    if (presetKey === 'today') {
      from = formatDate(today);
    } else if (presetKey === 'last7') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      from = formatDate(d);
    } else if (presetKey === 'last30') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      from = formatDate(d);
    } else if (presetKey === 'thisMonth') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      from = formatDate(d);
    } else if (presetKey === 'all') {
      from = '';
      to = '';
    }

    onUpdateFilters({ from, to });
  };

  return (
    <div className="audit-filters-card">
      <div className="audit-filters-grid">
        {/* Actor search */}
        <div className="audit-filter-item">
          <label htmlFor="filter-actor" className="audit-filter-label">
            Actor (User / Role)
          </label>
          <input
            id="filter-actor"
            type="text"
            className="audit-input"
            placeholder="Search by name, email, or role..."
            value={filters.actor || ''}
            onChange={(e) => onUpdateFilters({ actor: e.target.value })}
          />
        </div>

        {/* Action dropdown */}
        <div className="audit-filter-item">
          <label htmlFor="filter-action" className="audit-filter-label">
            Action
          </label>
          <select
            id="filter-action"
            className="audit-select"
            value={filters.action || ''}
            onChange={(e) => onUpdateFilters({ action: e.target.value })}
          >
            <option value="">All Actions ({AGREED_ACTIONS.length})</option>
            {AGREED_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>

        {/* Target Type dropdown */}
        <div className="audit-filter-item">
          <label htmlFor="filter-target" className="audit-filter-label">
            Target Type
          </label>
          <select
            id="filter-target"
            className="audit-select"
            value={filters.targetType || ''}
            onChange={(e) => onUpdateFilters({ targetType: e.target.value })}
          >
            <option value="">All Target Types</option>
            {TARGET_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Date presets & Pickers */}
        <div className="audit-filter-item date-range-group">
          <label className="audit-filter-label">Date Range & Presets</label>
          <div className="audit-preset-buttons">
            <button
              type="button"
              className="audit-preset-btn"
              onClick={() => handlePreset('today')}
            >
              Today
            </button>
            <button
              type="button"
              className="audit-preset-btn"
              onClick={() => handlePreset('last7')}
            >
              Last 7d
            </button>
            <button
              type="button"
              className="audit-preset-btn"
              onClick={() => handlePreset('last30')}
            >
              Last 30d
            </button>
            <button
              type="button"
              className="audit-preset-btn"
              onClick={() => handlePreset('thisMonth')}
            >
              This Month
            </button>
            <button
              type="button"
              className="audit-preset-btn"
              onClick={() => handlePreset('all')}
            >
              All Time
            </button>
          </div>
          <div className="audit-date-inputs">
            <input
              type="date"
              className="audit-date-input"
              value={filters.from || ''}
              onChange={(e) => onUpdateFilters({ from: e.target.value })}
              title="From date"
            />
            <span className="audit-date-separator">to</span>
            <input
              type="date"
              className="audit-date-input"
              value={filters.to || ''}
              onChange={(e) => onUpdateFilters({ to: e.target.value })}
              title="To date"
            />
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="audit-filters-toolbar">
        <div className="audit-results-count">
          Showing <strong>{total}</strong> log {total === 1 ? 'entry' : 'entries'}
        </div>

        <div className="audit-toolbar-buttons">
          {(filters.actor || filters.action || filters.targetType || filters.from || filters.to) && (
            <button
              type="button"
              className="audit-btn-clear"
              onClick={onClearFilters}
              title="Reset all filters"
            >
              Clear Filters
            </button>
          )}

          <button
            type="button"
            className="audit-btn-export"
            onClick={onExport}
            disabled={exporting || total === 0}
            title="Download CSV of current filter"
          >
            <span>📥</span>
            {exporting ? 'Exporting CSV...' : 'Export CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}

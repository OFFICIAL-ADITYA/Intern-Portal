export default function AnalyticsKPICards({ overviewData, loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="analytics-kpi-grid">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="kpi-card skeleton">
            <div className="skeleton-title"></div>
            <div className="skeleton-value"></div>
            <div className="skeleton-sub"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="widget-error-box">
        <p>⚠️ Failed to load Overview KPIs: {error}</p>
        <button type="button" className="retry-btn" onClick={onRetry}>
          Retry KPI Data
        </button>
      </div>
    );
  }

  const kpis = overviewData?.kpis || {};
  const changes = overviewData?.changes || {};

  const formatHours = (hours) => {
    if (!hours || hours === 0) return '0h';
    if (hours < 24) return `${hours}h`;
    const days = (hours / 24).toFixed(1);
    return `${days}d (${hours}h)`;
  };

  return (
    <div className="analytics-kpi-grid">
      <div className="kpi-card accent-blue">
        <div className="kpi-header">
          <span className="kpi-title">Total Interns</span>
          <span className="kpi-icon">👥</span>
        </div>
        <div className="kpi-value">{kpis.totalInterns || 0}</div>
        <div className="kpi-sub">
          <span>Active: <strong>{kpis.activeInterns || 0}</strong></span>
          <span className="dot">•</span>
          <span>Upcoming: <strong>{kpis.upcomingInterns || 0}</strong></span>
          <span>Cancelled: <strong>{kpis.cancelledInterns || 0}</strong></span>
        </div>
      </div>

      <div className="kpi-card accent-green">
        <div className="kpi-header">
          <span className="kpi-title">Active Interns</span>
          <span className="kpi-icon">⚡</span>
        </div>
        <div className="kpi-value">{kpis.activeInterns || 0}</div>
        <div className="kpi-sub">
          <span>Completed: <strong>{kpis.completedInterns || 0}</strong></span>
          <span>Team Leaders: <strong>{kpis.totalTeamLeaders || 0}</strong></span>
        </div>
      </div>

      <div className="kpi-card accent-amber">
        <div className="kpi-header">
          <span className="kpi-title">Pending Requests</span>
          <span className="kpi-icon">⏳</span>
        </div>
        <div className="kpi-value">{kpis.pendingRequests || 0}</div>
        <div className="kpi-sub">
          <span>Forwarded to Admin: <strong>{kpis.forwardedRequests || 0}</strong></span>
          <span>Requests in period: <strong>{kpis.requestsThisMonth || 0}</strong></span>
        </div>
      </div>

      <div className="kpi-card accent-purple">
        <div className="kpi-header">
          <span className="kpi-title">Certificates Issued</span>
          <span className="kpi-icon">📜</span>
        </div>
        <div className="kpi-value">{kpis.certificatesIssuedThisMonth || 0}</div>
        <div className="kpi-sub">
          {changes.certificates !== undefined && (
            <span className={`kpi-badge ${changes.certificates >= 0 ? 'pos' : 'neg'}`}>
              {changes.certificates >= 0 ? `▲ +${changes.certificates}%` : `▼ ${changes.certificates}%`}
            </span>
          )}
          <span className="sub-text">vs previous period</span>
        </div>
      </div>

      <div className="kpi-card accent-cyan">
        <div className="kpi-header">
          <span className="kpi-title">Avg Turnaround</span>
          <span className="kpi-icon">⏱️</span>
        </div>
        <div className="kpi-value">{formatHours(kpis.avgTurnaroundHours)}</div>
        <div className="kpi-sub">
          <span>Approval Rate: <strong>{kpis.approvalRate || 0}%</strong></span>
          <span>Rejection Rate: <strong>{kpis.rejectionRate || 0}%</strong></span>
        </div>
      </div>
    </div>
  );
}

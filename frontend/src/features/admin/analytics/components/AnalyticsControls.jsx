
export default function AnalyticsControls({
  range,
  setRange,
  from,
  setFrom,
  to,
  setTo,
  domain,
  setDomain,
  teamLeader,
  setTeamLeader,
  groupBy,
  setGroupBy,
  lastUpdated,
  onRefresh,
  onExport,
  domainsList = [],
  teamLeadersList = []
}) {
  return (
    <div className="analytics-controls-bar">
      <div className="controls-group">
        <div className="preset-buttons" role="group" aria-label="Date range preset">
          <button
            type="button"
            className={`control-preset-btn ${range === '7d' ? 'active' : ''}`}
            onClick={() => setRange('7d')}
          >
            7 Days
          </button>
          <button
            type="button"
            className={`control-preset-btn ${range === '30d' ? 'active' : ''}`}
            onClick={() => setRange('30d')}
          >
            30 Days
          </button>
          <button
            type="button"
            className={`control-preset-btn ${range === '6m' ? 'active' : ''}`}
            onClick={() => setRange('6m')}
          >
            6 Months
          </button>
          <button
            type="button"
            className={`control-preset-btn ${range === 'custom' ? 'active' : ''}`}
            onClick={() => setRange('custom')}
          >
            Custom
          </button>
        </div>

        {range === 'custom' && (
          <div className="custom-date-inputs">
            <input
              type="date"
              className="control-input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="From Date"
              aria-label="From Date"
            />
            <span className="date-separator">to</span>
            <input
              type="date"
              className="control-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="To Date"
              aria-label="To Date"
            />
          </div>
        )}

        {domainsList.length > 0 && (
          <select
            className="control-select"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            aria-label="Filter by Domain"
          >
            <option value="">All Domains</option>
            {domainsList.map((d) => (
              <option key={d.domain || d} value={d.domain || d}>
                {d.domain || d}
              </option>
            ))}
          </select>
        )}

        {teamLeadersList.length > 0 && (
          <select
            className="control-select"
            value={teamLeader}
            onChange={(e) => setTeamLeader(e.target.value)}
            aria-label="Filter by Team Leader"
          >
            <option value="">All Team Leaders</option>
            {teamLeadersList.map((tl) => (
              <option key={tl.id || tl._id} value={tl.id || tl._id}>
                {tl.fullName}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="controls-group right">
        <select
          className="control-select small"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value)}
          aria-label="Group trend by"
          title="Trend Granularity"
        >
          <option value="month">By Month</option>
          <option value="week">By Week</option>
          <option value="day">By Day</option>
        </select>

        <button
          type="button"
          className="control-action-btn export"
          onClick={() => onExport('overview')}
          title="Export Analytics to CSV"
        >
          <span>📥</span> Export CSV
        </button>

        <button
          type="button"
          className="control-action-btn export"
          onClick={() => onExport('overview', 'xlsx')}
          title="Export Analytics to Excel"
        >
          Export Excel
        </button>

        <button
          type="button"
          className="control-action-btn refresh"
          onClick={onRefresh}
          title="Refresh Data"
        >
          <span>🔄</span> Refresh
        </button>

        {lastUpdated && (
          <span className="last-updated-text">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}

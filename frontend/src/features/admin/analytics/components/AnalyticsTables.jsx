import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnalyticsExportActions from './AnalyticsExportActions';

export default function AnalyticsTables({
  teamLeadersData,
  stuckData,
  upcomingData,
  loadingMap,
  errorMap,
  onRetry,
  onExport,
  onOpenRequests
}) {
  const navigate = useNavigate();
  const [tlSortKey, setTlSortKey] = useState('pendingReviews');
  const [tlSortAsc, setTlSortAsc] = useState(false);

  const handleSort = (key) => {
    if (tlSortKey === key) {
      setTlSortAsc(!tlSortAsc);
    } else {
      setTlSortKey(key);
      setTlSortAsc(false);
    }
  };

  const sortedTeamLeaders = [...(teamLeadersData || [])].sort((a, b) => {
    let valA = a[tlSortKey];
    let valB = b[tlSortKey];
    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }
    if (valA < valB) return tlSortAsc ? -1 : 1;
    if (valA > valB) return tlSortAsc ? 1 : -1;
    return 0;
  });

  return (
    <div className="analytics-tables-container">
      {/* 1. Team Leader Performance Table */}
      <div className="table-card">
        <div className="table-card-header">
          <div>
            <h3>Team Leader Performance Matrix</h3>
            <p className="table-subtitle">Review speeds, pending counts, and overdue flags per Team Leader</p>
          </div>
          <AnalyticsExportActions onExport={onExport} type="team-leaders" formats={['xlsx']} />
          <button
            type="button"
            className="table-export-btn"
            onClick={() => onExport('team-leaders')}
          >
            <span>📥</span> Export CSV
          </button>
        </div>

        {loadingMap.teamLeaders ? (
          <div className="table-skeleton">Loading performance matrix...</div>
        ) : errorMap.teamLeaders ? (
          <div className="widget-error-box">
            <p>⚠️ Error: {errorMap.teamLeaders}</p>
            <button className="retry-btn" onClick={() => onRetry('teamLeaders')}>Retry</button>
          </div>
        ) : sortedTeamLeaders.length === 0 ? (
          <div className="empty-state">No Team Leaders registered yet</div>
        ) : (
          <div className="table-wrapper">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('fullName')}>
                    Team Leader {tlSortKey === 'fullName' ? (tlSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('internsAssigned')}>
                    Interns {tlSortKey === 'internsAssigned' ? (tlSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('requestsReviewed')}>
                    Reviewed {tlSortKey === 'requestsReviewed' ? (tlSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('pendingReviews')}>
                    Pending {tlSortKey === 'pendingReviews' ? (tlSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('avgReviewTimeHours')}>
                    Avg Review Time {tlSortKey === 'avgReviewTimeHours' ? (tlSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('rejectionRate')}>
                    Rejection Rate {tlSortKey === 'rejectionRate' ? (tlSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th>Overdue Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedTeamLeaders.map((tl) => (
                  <tr key={tl.id} className={tl.hasOverdueRequests ? 'row-overdue-highlight' : ''}>
                    <td>
                      <div className="tl-name-cell">
                        <strong>{tl.fullName}</strong>
                        <small>{tl.email}</small>
                      </div>
                    </td>
                    <td><span className="pill blue">{tl.internsAssigned}</span></td>
                    <td><span className="pill green">{tl.requestsReviewed}</span></td>
                    <td>
                      <span className={`pill ${tl.pendingReviews > 0 ? 'amber' : 'gray'}`}>
                        {tl.pendingReviews}
                      </span>
                    </td>
                    <td>{tl.avgReviewTimeHours > 0 ? `${tl.avgReviewTimeHours} hrs` : 'N/A'}</td>
                    <td>{tl.rejectionRate}%</td>
                    <td>
                      {tl.hasOverdueRequests ? (
                        <span className="status-badge alert" title={`Longest pending request: ${tl.maxPendingDays} days`}>
                          ⚠️ Overdue ({tl.maxPendingDays}d)
                        </span>
                      ) : (
                        <span className="status-badge ok">✓ On Track</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Stuck Requests & Upcoming Completions Grid */}
      <div className="tables-duo-grid">
        {/* Stuck Requests List */}
        <div className="table-card">
          <div className="table-card-header">
            <div>
              <h3>Requests Pending &gt; 3 Days</h3>
              <p className="table-subtitle">Requests stuck in bottleneck stages</p>
            </div>
            <AnalyticsExportActions onExport={onExport} type="stuck-requests" formats={['xlsx']} />
            <button
              type="button"
              className="table-export-btn"
              onClick={() => onExport('stuck-requests')}
            >
              <span>📥</span> Export CSV
            </button>
          </div>

          {loadingMap.stuck ? (
            <div className="table-skeleton">Loading stuck requests...</div>
          ) : errorMap.stuck ? (
            <div className="widget-error-box">
              <p>⚠️ Error: {errorMap.stuck}</p>
              <button className="retry-btn" onClick={() => onRetry('stuck')}>Retry</button>
            </div>
          ) : !stuckData || stuckData.length === 0 ? (
            <div className="empty-state">🎉 No stuck requests! All requests are up to date.</div>
          ) : (
            <div className="table-wrapper">
              <table className="analytics-table mini">
                <thead>
                  <tr>
                    <th>Request #</th>
                    <th>Intern</th>
                    <th>Days Pending</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stuckData.map((item) => (
                    <tr key={item.id} className="row-stuck-warning">
                      <td><strong>{item.requestNumber}</strong></td>
                      <td>
                        <div className="tl-name-cell">
                          <span>{item.internName}</span>
                          <small>{item.certificateType}</small>
                        </div>
                      </td>
                      <td>
                        <span className="days-pending-badge">
                          ⏳ {item.daysPending} days
                        </span>
                      </td>
                      <td>
                        <span className={`status-tag ${item.status}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.reviewLink ? (
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => item.reviewLink === 'requests-queue' ? onOpenRequests?.() : navigate(item.reviewLink)}
                          >
                            {item.reviewLink === 'requests-queue' ? 'Open Retry Queue →' : 'Review →'}
                          </button>
                        ) : <span title="This request is waiting for Team Leader review">Awaiting TL</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Completions */}
        <div className="table-card">
          <div className="table-card-header">
            <div>
              <h3>Upcoming Internship Completions</h3>
              <p className="table-subtitle">Interns with end dates in the selected date window</p>
            </div>
            <AnalyticsExportActions onExport={onExport} type="upcoming-completions" formats={['xlsx']} />
            <button
              type="button"
              className="table-export-btn"
              onClick={() => onExport('upcoming-completions')}
            >
              <span>📥</span> Export CSV
            </button>
          </div>

          {loadingMap.upcoming ? (
            <div className="table-skeleton">Loading upcoming completions...</div>
          ) : errorMap.upcoming ? (
            <div className="widget-error-box">
              <p>⚠️ Error: {errorMap.upcoming}</p>
              <button className="retry-btn" onClick={() => onRetry('upcoming')}>Retry</button>
            </div>
          ) : !upcomingData || upcomingData.length === 0 ? (
            <div className="empty-state">No upcoming completions found for this filter</div>
          ) : (
            <div className="table-wrapper">
              <table className="analytics-table mini">
                <thead>
                  <tr>
                    <th>Intern</th>
                    <th>End Date</th>
                    <th>Remaining</th>
                    <th>Cert Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingData.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="tl-name-cell">
                          <strong>{item.fullName}</strong>
                          <small>{item.domain} • TL: {item.teamLeaderName}</small>
                        </div>
                      </td>
                      <td>{new Date(item.endDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`pill ${item.daysRemaining <= 7 ? 'amber' : 'blue'}`}>
                          {item.daysRemaining} days left
                        </span>
                      </td>
                      <td>
                        {item.hasRequestedCertificate ? (
                          <span className="status-badge ok">✓ {item.certificateStatus}</span>
                        ) : (
                          <span className="status-badge not-requested">Not Requested Yet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

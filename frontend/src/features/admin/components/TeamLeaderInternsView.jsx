import useTeamLeaderInterns from '../hooks/useTeamLeaderInterns';
import './TeamLeadersSection.css';

const formatDate = (date) => date
  ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

export default function TeamLeaderInternsView({ teamLeaderId, onBack }) {
  const { teamLeader, interns, loading, error, refetch } = useTeamLeaderInterns(teamLeaderId);

  return (
    <section className="team-leaders-panel" aria-labelledby="team-leader-interns-title">
      <button className="team-leaders-back" type="button" onClick={onBack}>← Back to Team Leaders</button>

      {loading && (
        <div className="team-interns-loading" aria-label="Loading interns">
          <div className="team-interns-title-skeleton" />
          {[1, 2].map((item) => <div className="intern-skeleton" key={item} />)}
        </div>
      )}

      {!loading && error && (
        <div className="team-leaders-error" role="alert">
          <span>{error === 'Team leader not found' ? 'This team leader could not be found.' : error}</span>
          <button type="button" onClick={refetch}>Retry</button>
        </div>
      )}

      {!loading && !error && teamLeader && (
        <>
          <div className="team-leaders-heading team-interns-heading">
            <div>
              <p className="admin-eyebrow">ASSIGNED INTERNS</p>
              <h2 id="team-leader-interns-title">Interns under {teamLeader.fullName}</h2>
              <p>{teamLeader.email}</p>
            </div>
            <span className="team-leaders-count">{interns.length} assigned</span>
          </div>

          {!interns.length && <p className="team-leaders-state">This team leader has no interns assigned yet</p>}

          {interns.length > 0 && (
            <div className="intern-list">
              {interns.map((intern) => (
                <article className="intern-row" key={intern._id || intern.id || intern.email}>
                  <div className="intern-row-heading">
                    <div>
                      <h3>{intern.fullName}</h3>
                      <p>{intern.email}</p>
                    </div>
                    <span className="intern-status">{intern.internshipDetails?.status || '—'}</span>
                  </div>
                  <div className="intern-details">
                    <div><span>Intern code</span><strong>{intern.internCode || '—'}</strong></div>
                    <div><span>Domain</span><strong>{intern.domain || '—'}</strong></div>
                    <div><span>Start date</span><strong>{formatDate(intern.startDate)}</strong></div>
                    <div><span>End date</span><strong>{formatDate(intern.endDate)}</strong></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

import AnalyticsExportActions from './AnalyticsExportActions';

const stages = [
  ['timeToTLReview', 'Request to Team Leader review'],
  ['timeToAdminFinalize', 'Team Leader review to completion'],
  ['totalTurnaround', 'Request to certificate issued']
];

export default function AnalyticsTurnaround({ data, loading, error, onRetry, onExport }) {
  return (
    <section className="turnaround-card" aria-labelledby="turnaround-title">
      <div className="turnaround-heading"><div><h2 id="turnaround-title">Certificate Turnaround</h2><p>Average, median, and 90th percentile by workflow stage.</p></div><AnalyticsExportActions onExport={onExport} type="turnaround" /></div>
      {loading ? <div className="turnaround-state">Calculating turnaround metrics…</div>
        : error ? <div className="widget-error-box"><p>Failed to load turnaround metrics: {error}</p><button className="retry-btn" onClick={onRetry}>Retry</button></div>
          : <div className="turnaround-grid">{stages.map(([key, title]) => {
            const stats = data?.[key] || { avg: 0, median: 0, p90: 0 };
            return <article className="turnaround-stage" key={key}>
              <h3>{title}</h3>
              <dl><div><dt>Average</dt><dd>{stats.avg}h</dd></div><div><dt>Median</dt><dd>{stats.median}h</dd></div><div><dt>90th percentile</dt><dd>{stats.p90}h</dd></div></dl>
            </article>;
          })}</div>}
    </section>
  );
}

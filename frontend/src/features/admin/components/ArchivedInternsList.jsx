import { useState } from 'react';
import Toast from '../../../shared/components/Toast';
import useArchivedInterns from '../hooks/useArchivedInterns';
import './RetentionManagement.css';

const dateLabel = (value) => value
  ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

export default function ArchivedInternsList() {
  const { interns, loading, error, refresh, restore } = useArchivedInterns();
  const [restoringId, setRestoringId] = useState('');
  const [toast, setToast] = useState(null);

  const handleRestore = async (intern) => {
    if (!window.confirm(`Restore ${intern.fullName} and re-enable their portal login?`)) return;
    setRestoringId(intern._id);
    try {
      const message = await restore(intern);
      setToast({ type: 'success', message });
    } catch (requestError) {
      setToast({ type: 'error', message: requestError.message || 'Unable to restore this intern.' });
    } finally {
      setRestoringId('');
    }
  };

  return (
    <section className="archived-interns-card" aria-labelledby="archived-interns-title">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <header>
        <div><p className="admin-eyebrow">FORMER INTERNS</p><h2 id="archived-interns-title">Archived accounts</h2></div>
        <button type="button" onClick={refresh} disabled={loading}>Refresh</button>
      </header>
      {loading ? (
        <div className="retention-state" role="status">Loading archived interns…</div>
      ) : error ? (
        <div className="retention-state retention-error" role="alert"><span>{error}</span><button type="button" onClick={refresh}>Retry</button></div>
      ) : interns.length === 0 ? (
        <div className="retention-state">No archived interns.</div>
      ) : (
        <div className="retention-table-wrap">
          <table className="retention-table">
            <thead><tr><th>Name</th><th>Intern code</th><th>Domain</th><th>Archived</th><th>Days before purge</th><th>Action</th></tr></thead>
            <tbody>{interns.map((intern) => (
              <tr key={intern._id}>
                <td>{intern.fullName}<small>{intern.email}</small></td>
                <td>{intern.internCode || '—'}</td>
                <td>{intern.domain || '—'}</td>
                <td>{dateLabel(intern.archivedAt)}</td>
                <td>{intern.daysLeftBeforePurge}</td>
                <td><button type="button" onClick={() => handleRestore(intern)} disabled={restoringId === intern._id}>{restoringId === intern._id ? 'Restoring…' : 'Restore'}</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

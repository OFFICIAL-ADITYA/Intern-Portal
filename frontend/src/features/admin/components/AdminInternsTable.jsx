import StatusBadge from '../../shared/components/StatusBadge';

const formatDate = (date) => date
  ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

export default function AdminInternsTable({ interns, onEdit, onAssign }) {
  if (!interns.length) return <p className="team-leaders-state admin-interns-filter-empty">No interns match these filters.</p>;

  return (
    <div className="admin-interns-table-wrapper">
      <table className="admin-interns-table">
        <thead><tr><th>Intern</th><th>Intern Code</th><th>Domain</th><th>Dates</th><th>Team Leader</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{interns.map((intern) => {
          const assignedTl = intern.internshipDetails?.teamLeader?.fullName || intern.internshipDetails?.teamleaderEmail || 'Unassigned';
          return (
            <tr key={intern._id}>
              <td><div className="admin-intern-user-cell"><div className="admin-intern-avatar">{intern.fullName?.charAt(0)?.toUpperCase() || 'I'}</div><div><strong>{intern.fullName}</strong><div style={{ color: 'var(--muted)', fontSize: '12px' }}>{intern.email}</div>{intern.mobileNo && <div style={{ color: 'var(--muted)', fontSize: '11px' }}>{intern.mobileNo}</div>}</div></div></td>
              <td><code>{intern.internCode || '—'}</code></td>
              <td>{intern.domain || '—'}</td>
              <td><small style={{ color: 'var(--muted)' }}>{formatDate(intern.startDate)} → {formatDate(intern.endDate)}</small></td>
              <td><span style={{ fontWeight: 600 }}>{assignedTl}</span></td>
              <td><StatusBadge status={intern.internshipDetails?.status} /></td>
              <td><div className="admin-intern-actions"><button type="button" className="admin-btn-sm" onClick={() => onEdit(intern)} title="View / Edit Profile">Edit</button><button type="button" className="admin-btn-sm admin-btn-primary-sm" onClick={() => onAssign(intern)} title="Assign or Reassign Team Leader">Assign TL</button></div></td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

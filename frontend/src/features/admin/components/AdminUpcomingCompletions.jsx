import { useEffect, useState } from 'react';
import { getAllInterns } from '../services/admin.service';
import './AdminUpcomingCompletions.css';

export default function AdminUpcomingCompletions() {
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllInterns()
      .then(({ interns: allInterns = [] }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirdDay = new Date(today);
        thirdDay.setDate(thirdDay.getDate() + 3);
        setInterns(allInterns.filter((intern) => {
          if (!intern.endDate || ['completed', 'cancelled'].includes(intern.internshipDetails?.status)) return false;
          const endDate = new Date(intern.endDate);
          endDate.setHours(0, 0, 0, 0);
          return endDate >= today && endDate <= thirdDay;
        }).sort((a, b) => new Date(a.endDate) - new Date(b.endDate)));
      })
      .catch((requestError) => setError(requestError.message || 'Could not load upcoming completions.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="admin-upcoming-card" aria-labelledby="admin-upcoming-title">
      <div className="admin-upcoming-heading">
        <div><p className="admin-eyebrow">INTERN MANAGEMENT</p><h2 id="admin-upcoming-title">Completing in the next 3 days</h2><p>Internships ending today through three days from now.</p></div>
        {!loading && !error && <span>{interns.length}</span>}
      </div>
      {loading ? <p className="admin-upcoming-state">Loading upcoming completions…</p>
        : error ? <p className="admin-upcoming-state" role="alert">{error}</p>
          : interns.length === 0 ? <p className="admin-upcoming-state">No interns are completing their internship within the next 3 days.</p>
            : <div className="admin-upcoming-list">{interns.map((intern) => (
              <article className="admin-upcoming-item" key={intern._id}>
                <div><strong>{intern.fullName}</strong><small>{intern.internCode || intern.email} · {intern.domain || 'Internship'}</small></div>
                <div><strong>{new Date(intern.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong><small>{intern.internshipDetails?.teamLeader?.fullName || intern.internshipDetails?.teamleaderEmail || 'Unassigned'}</small></div>
              </article>
            ))}</div>}
    </section>
  );
}

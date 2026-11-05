import { useState } from 'react';
import StatusBadge from '../../shared/components/StatusBadge';
import useMyInterns from '../hooks/useMyInterns';
import { updateAssignedIntern } from '../services/tl.service';
import './MyInternsList.css';

const formatDate = (date) => date
  ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

export default function MyInternsList() {
  const [upcomingFilters, setUpcomingFilters] = useState({ search: '', status: '' });
  const [remainingFilters, setRemainingFilters] = useState({ search: '', status: '' });

  const { interns, loading, error, refetch } = useMyInterns();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirdDay = new Date(today);
  thirdDay.setDate(thirdDay.getDate() + 3);
  const completingSoon = interns.filter((intern) => {
    if (!intern.endDate || ['completed', 'cancelled'].includes(intern.internshipDetails?.status)) return false;
    const endDate = new Date(intern.endDate);
    endDate.setHours(0, 0, 0, 0);
    return endDate >= today && endDate <= thirdDay;
  });
  const remainingInterns = interns.filter((intern) => !completingSoon.includes(intern));
  const filterInterns = (rows, filters) => rows.filter((intern) => {
    const query = filters.search.trim().toLowerCase();
    const matchesSearch = !query || [intern.fullName, intern.email, intern.internCode, intern.domain]
      .some((value) => value?.toLowerCase().includes(query));
    return matchesSearch && (!filters.status || intern.internshipDetails?.status === filters.status);
  });
  const filteredUpcoming = filterInterns(completingSoon, upcomingFilters);
  const filteredRemaining = filterInterns(remainingInterns, remainingFilters);
  const renderFilters = (filters, setFilters, label) => (
    <div className="my-interns-toolbar" aria-label={`${label} filters`}>
      <input type="search" placeholder="Search by name, email, intern code, or domain..." value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
      <select aria-label={`${label} status`} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
        <option value="">All Statuses</option><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
      </select>
    </div>
  );

  // Edit Modal State
  const [editingIntern, setEditingIntern] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState(null);

  const openEditModal = (intern) => {
    setEditingIntern(intern);
    setEditForm({
      fullName: intern.fullName || '',
      mobileNo: intern.mobileNo || '',
      domain: intern.domain || '',
      startDate: intern.startDate ? new Date(intern.startDate).toISOString().slice(0, 10) : '',
      endDate: intern.endDate ? new Date(intern.endDate).toISOString().slice(0, 10) : '',
      collegeName: intern.internshipDetails?.collegeName || '',
      degree: intern.internshipDetails?.degree || '',
      internshipTitle: intern.internshipDetails?.internshipTitle || '',
      mentor: intern.internshipDetails?.mentor || '',
      performanceRemarks: intern.internshipDetails?.performanceRemarks || '',
      status: intern.internshipDetails?.status || 'ongoing'
    });
    setEditMsg(null);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (editForm.startDate && editForm.endDate && new Date(editForm.startDate) > new Date(editForm.endDate)) {
      setEditMsg({ type: 'error', text: 'Start date cannot be after end date' });
      return;
    }
    setEditLoading(true);
    setEditMsg(null);
    try {
      await updateAssignedIntern(editingIntern._id || editingIntern.id, editForm);
      setEditMsg({ type: 'success', text: 'Intern updated successfully!' });
      setTimeout(() => {
        setEditingIntern(null);
        refetch();
      }, 700);
    } catch (err) {
      setEditMsg({ type: 'error', text: err.message || 'Failed to update intern' });
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <section className="my-interns-panel" aria-labelledby="my-interns-title">
      <div className="my-interns-heading">
        <div>
          <p className="request-eyebrow">TEAM DIRECTORY</p>
          <h2 id="my-interns-title">My Interns</h2>
          <p>Manage and review only the interns assigned to your team.</p>
        </div>
        {!loading && !error && <span className="my-interns-count">{interns.length} assigned</span>}
      </div>

      {loading && (
        <div className="my-interns-list" aria-label="Loading interns">
          {[1, 2, 3].map((item) => <div className="my-intern-skeleton" key={item} />)}
        </div>
      )}

      {!loading && error && (
        <div className="my-interns-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={refetch}>Retry</button>
        </div>
      )}

      {!loading && !error && !interns.length && (
        <p className="my-interns-state">No interns assigned to you yet</p>
      )}

      {!loading && !error && interns.length > 0 && (
        <>
        <section className="my-interns-group" aria-labelledby="completing-soon-title">
          <div className="my-interns-group-heading">
            <div><h3 id="completing-soon-title">Completing in the next 3 days</h3><p>Internships ending today through three days from now.</p></div>
            <span>{filteredUpcoming.length}</span>
          </div>
          {renderFilters(upcomingFilters, setUpcomingFilters, 'Completing soon')}
          {filteredUpcoming.length ? <div className="my-interns-list">
          {filteredUpcoming.map((intern) => (
            <article className="my-intern-row" key={intern._id || intern.id || intern.email}>
              <div className="my-intern-row-heading">
                <div>
                  <h3>{intern.fullName}</h3>
                  <p>{intern.email}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <StatusBadge status={intern.internshipDetails?.status} />
                  <button
                    type="button"
                    className="admin-btn-sm"
                    onClick={() => openEditModal(intern)}
                    title="View & Edit Intern Details"
                  >
                    View / Edit
                  </button>
                </div>
              </div>
              <div className="my-intern-details">
                <div><span>Intern code</span><strong>{intern.internCode || '—'}</strong></div>
                <div><span>Domain</span><strong>{intern.domain || '—'}</strong></div>
                <div><span>Mentor</span><strong>{intern.internshipDetails?.mentor || '—'}</strong></div>
                <div><span>Start date</span><strong>{formatDate(intern.startDate)}</strong></div>
                <div><span>End date</span><strong>{formatDate(intern.endDate)}</strong></div>
              </div>
            </article>
          ))}
          </div> : <p className="my-interns-state">No interns match these filters in this group.</p>}
        </section>
        <section className="my-interns-group" aria-labelledby="remaining-interns-title">
          <div className="my-interns-group-heading">
            <div><h3 id="remaining-interns-title">All remaining interns</h3><p>Every other intern assigned to your team.</p></div>
            <span>{filteredRemaining.length}</span>
          </div>
          {renderFilters(remainingFilters, setRemainingFilters, 'Remaining interns')}
          {filteredRemaining.length ? <div className="my-interns-list">
          {filteredRemaining.map((intern) => (
            <article className="my-intern-row" key={intern._id || intern.id || intern.email}>
              <div className="my-intern-row-heading">
                <div><h3>{intern.fullName}</h3><p>{intern.email}</p></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <StatusBadge status={intern.internshipDetails?.status} />
                  <button type="button" className="admin-btn-sm" onClick={() => openEditModal(intern)} title="View & Edit Intern Details">View / Edit</button>
                </div>
              </div>
              <div className="my-intern-details">
                <div><span>Intern code</span><strong>{intern.internCode || '—'}</strong></div>
                <div><span>Domain</span><strong>{intern.domain || '—'}</strong></div>
                <div><span>Mentor</span><strong>{intern.internshipDetails?.mentor || '—'}</strong></div>
                <div><span>Start date</span><strong>{formatDate(intern.startDate)}</strong></div>
                <div><span>End date</span><strong>{formatDate(intern.endDate)}</strong></div>
              </div>
            </article>
          ))}
          </div> : <p className="my-interns-state">No other interns match the selected filters.</p>}
        </section>
        </>
      )}

      {/* Edit Intern Modal for TL */}
      {editingIntern && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal-card">
            <h3>Edit Intern Details</h3>
            <p>Update assigned intern information for <strong>{editingIntern.fullName}</strong>.</p>

            {editMsg && (
              <div className={`admin-alert-box ${editMsg.type}`}>
                {editMsg.text}
              </div>
            )}

            <form onSubmit={handleEditSave}>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label>Mobile Number</label>
                  <input
                    type="text"
                    value={editForm.mobileNo}
                    onChange={(e) => setEditForm({ ...editForm, mobileNo: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>Domain / Track</label>
                  <input
                    type="text"
                    value={editForm.domain}
                    onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>Internship Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>College / University</label>
                  <input
                    type="text"
                    value={editForm.collegeName}
                    onChange={(e) => setEditForm({ ...editForm, collegeName: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>Degree / Course</label>
                  <input
                    type="text"
                    value={editForm.degree}
                    onChange={(e) => setEditForm({ ...editForm, degree: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>Internship Title</label>
                  <input
                    type="text"
                    value={editForm.internshipTitle}
                    onChange={(e) => setEditForm({ ...editForm, internshipTitle: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>Mentor Name</label>
                  <input
                    type="text"
                    value={editForm.mentor}
                    onChange={(e) => setEditForm({ ...editForm, mentor: e.target.value })}
                  />
                </div>

                <div className="admin-form-group admin-form-full">
                  <label>Performance Remarks</label>
                  <textarea
                    rows={2}
                    value={editForm.performanceRemarks}
                    onChange={(e) => setEditForm({ ...editForm, performanceRemarks: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn-sm"
                  onClick={() => setEditingIntern(null)}
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-sm admin-btn-primary-sm"
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

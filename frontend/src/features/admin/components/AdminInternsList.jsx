import { useState, useEffect, useCallback } from 'react';
import { getAllInterns, getAllTeamLeaders, assignInternTeamLeader, updateIntern } from '../services/admin.service';
import AdminInternsTable from './AdminInternsTable';
import './AdminInternsList.css';

export default function AdminInternsList() {
  const [interns, setInterns] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [upcomingFilters, setUpcomingFilters] = useState({ search: '', status: '', teamLeader: '' });
  const [remainingFilters, setRemainingFilters] = useState({ search: '', status: '', teamLeader: '' });

  // Modals state
  const [assigningIntern, setAssigningIntern] = useState(null);
  const [selectedTlId, setSelectedTlId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMsg, setAssignMsg] = useState(null);

  const [editingIntern, setEditingIntern] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState(null);

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
  const completingSoonIds = new Set(completingSoon.map((intern) => intern._id));
  const remainingInterns = interns.filter((intern) => !completingSoonIds.has(intern._id));
  const filterInterns = (rows, filters) => rows.filter((intern) => {
    const query = filters.search.trim().toLowerCase();
    const matchesSearch = !query || [intern.fullName, intern.email, intern.internCode, intern.domain]
      .some((value) => value?.toLowerCase().includes(query));
    const leader = intern.internshipDetails?.teamLeader;
    const matchesLeader = !filters.teamLeader || leader?._id === filters.teamLeader ||
      intern.internshipDetails?.teamleaderEmail === filters.teamLeader;
    return matchesSearch && (!filters.status || intern.internshipDetails?.status === filters.status) && matchesLeader;
  });
  const filteredUpcoming = filterInterns(completingSoon, upcomingFilters);
  const filteredRemaining = filterInterns(remainingInterns, remainingFilters);
  const renderFilters = (filters, setFilters, label) => (
    <div className="admin-interns-toolbar" aria-label={`${label} filters`}>
      <input type="text" className="admin-interns-search" placeholder="Search by name, email, intern code, or domain..." value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
      <select className="admin-interns-filter" aria-label={`${label} status`} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
        <option value="">All Statuses</option><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
      </select>
      <select className="admin-interns-filter" aria-label={`${label} team leader`} value={filters.teamLeader} onChange={(event) => setFilters((current) => ({ ...current, teamLeader: event.target.value }))}>
        <option value="">All Team Leaders</option>
        {teamLeaders.map((tl) => <option key={tl._id} value={tl._id}>{tl.fullName} ({tl.email})</option>)}
      </select>
    </div>
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [internsData, tlData] = await Promise.all([
        getAllInterns(),
        getAllTeamLeaders()
      ]);
      setInterns(internsData.interns || []);
      setTeamLeaders(tlData.teamLeaders || []);
    } catch (err) {
      setError(err.message || 'Failed to load intern data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  // Assignment Handler
  const openAssignModal = (intern) => {
    setAssigningIntern(intern);
    setSelectedTlId(intern.internshipDetails?.teamLeader?._id || '');
    setAssignMsg(null);
  };

  const handleAssignSave = async (e) => {
    e.preventDefault();
    if (!selectedTlId) {
      setAssignMsg({ type: 'error', text: 'Please select a Team Leader' });
      return;
    }
    setAssignLoading(true);
    setAssignMsg(null);
    try {
      await assignInternTeamLeader(assigningIntern._id, selectedTlId);
      setAssignMsg({ type: 'success', text: 'Team Leader assigned successfully!' });
      setTimeout(() => {
        setAssigningIntern(null);
        loadData();
      }, 800);
    } catch (err) {
      setAssignMsg({ type: 'error', text: err.message || 'Failed to assign Team Leader' });
    } finally {
      setAssignLoading(false);
    }
  };

  // Edit Profile Handler
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
      status: intern.internshipDetails?.status || 'upcoming'
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
      await updateIntern(editingIntern._id, editForm);
      setEditMsg({ type: 'success', text: 'Intern profile updated successfully!' });
      setTimeout(() => {
        setEditingIntern(null);
        loadData();
      }, 800);
    } catch (err) {
      setEditMsg({ type: 'error', text: err.message || 'Failed to update intern profile' });
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <section className="admin-interns-panel" aria-labelledby="admin-interns-title">
      <div className="admin-interns-header">
        <div>
          <p className="admin-eyebrow">PORTAL DIRECTORY</p>
          <h2 id="admin-interns-title">Intern Management</h2>
          <p>Full administrative oversight across all interns and Team Leader assignments.</p>
        </div>
        <span className="team-leaders-count">{interns.length} total interns</span>
      </div>

      {loading && (
        <div className="team-leader-list" style={{ marginTop: '20px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="team-leader-skeleton" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="admin-alert-box error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="admin-interns-group" aria-label="Interns completing soon">
            <h3>Completing in the next 3 days <span>({filteredUpcoming.length})</span></h3>
            {renderFilters(upcomingFilters, setUpcomingFilters, 'Completing soon')}
            <AdminInternsTable interns={filteredUpcoming} onEdit={openEditModal} onAssign={openAssignModal} />
          </section>
          <section className="admin-interns-group" aria-label="All remaining interns">
            <h3>All remaining interns <span>({filteredRemaining.length})</span></h3>
            {renderFilters(remainingFilters, setRemainingFilters, 'Remaining interns')}
            <AdminInternsTable interns={filteredRemaining} onEdit={openEditModal} onAssign={openAssignModal} />
          </section>
        </>
      )}

      {/* Assign / Reassign TL Modal */}
      {assigningIntern && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal-card">
            <h3>Assign Team Leader</h3>
            <p>
              Reassign <strong>{assigningIntern.fullName}</strong> to a verified Team Leader.
              The new Team Leader will immediately gain management access.
            </p>

            {assignMsg && (
              <div className={`admin-alert-box ${assignMsg.type}`}>
                {assignMsg.text}
              </div>
            )}

            <form onSubmit={handleAssignSave}>
              <div className="admin-form-group" style={{ marginBottom: '16px' }}>
                <label>Current Assigned Team Leader</label>
                <div style={{ padding: '8px 12px', background: 'var(--input)', borderRadius: '8px', fontSize: '13px' }}>
                  {assigningIntern.internshipDetails?.teamLeader?.fullName ||
                    assigningIntern.internshipDetails?.teamleaderEmail ||
                    'None (Unassigned)'}
                </div>
              </div>

              <div className="admin-form-group">
                <label htmlFor="tl-select">Select New Team Leader *</label>
                <select
                  id="tl-select"
                  value={selectedTlId}
                  onChange={(e) => setSelectedTlId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Team Leader --</option>
                  {teamLeaders.map((tl) => (
                    <option key={tl._id} value={tl._id}>
                      {tl.fullName} ({tl.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn-sm"
                  onClick={() => setAssigningIntern(null)}
                  disabled={assignLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-sm admin-btn-primary-sm"
                  disabled={assignLoading}
                >
                  {assignLoading ? 'Saving...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Intern Profile Modal */}
      {editingIntern && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal-card">
            <h3>Edit Intern Profile</h3>
            <p>Update permitted profile and internship details for <strong>{editingIntern.fullName}</strong>.</p>

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

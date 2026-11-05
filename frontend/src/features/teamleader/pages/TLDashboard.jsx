import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import CreateIntern from '../components/CreateIntern';
import MyInternsList from '../components/MyInternsList';
import UpcomingCompletions from '../components/UpcomingCompletions';
import PendingReviewList from '../components/PendingReviewList';
import NotificationBell from '../../../shared/components/NotificationBell';
import { getUpcomingCompletions } from '../services/tl.service';
import './TLDashboard.css';

const TLDashboard = () => {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeView, setActiveView] = useState('overview');
  const [upcomingCompletions, setUpcomingCompletions] = useState([]);

  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam && ['overview', 'requests', 'myInterns', 'intern'].includes(viewParam)) {
      setActiveView(viewParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchUpcomingCompletions = async () => {
      try {
        const data = await getUpcomingCompletions();
        setUpcomingCompletions(data.upcomingCompletions || []);
      } catch (error) {
        console.error('Failed to fetch upcoming completions:', error);
      }
    };

    fetchUpcomingCompletions();
  }, []);

  const initials = (user?.fullName || 'Team Leader')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const logout = () => {
    handleLogout();
    navigate('/login');
  };

  return (
    <div className="admin-dashboard-shell">
      <header className="admin-topbar">
        <div className="admin-brand"><span className="admin-brand-icon">UP</span><strong>uptoskills</strong></div>
        <div className="admin-topbar-user">
          <NotificationBell userRole="teamleader" onNavigateTab={(view) => setActiveView(view)} />
          <div className="admin-avatar">{initials}</div>
          <div><strong>{user?.fullName || 'Team Leader'}</strong><small>{user?.email || 'Loading profile...'}</small></div>
          <button className="admin-logout" onClick={logout} title="Sign out"><span>↩</span> Logout</button>
        </div>
      </header>

      <aside className="admin-sidebar" aria-label="Team leader navigation">
        <p className="admin-sidebar-label">Workspace</p>
        <nav className="admin-sidebar-nav">
          <button className={`admin-nav-item ${activeView === 'overview' ? 'active' : ''}`} onClick={() => setActiveView('overview')}><span>▦</span> Overview</button>
          <button className={`admin-nav-item ${activeView === 'requests' ? 'active' : ''}`} onClick={() => setActiveView('requests')}><span>▤</span> Certificate Requests</button>
          <button className={`admin-nav-item ${activeView === 'myInterns' ? 'active' : ''}`} onClick={() => setActiveView('myInterns')}><span>♙</span> My Interns</button>
          <button className={`admin-nav-item ${activeView === 'intern' ? 'active' : ''}`} onClick={() => setActiveView('intern')}><span>＋</span> Create Intern</button>
        </nav>
        <div className="admin-sidebar-note"><span>●</span> Team leader access enabled</div>
      </aside>

      <main className="admin-dashboard-main">
        <header className="admin-page-header">
          <p className="admin-eyebrow">TEAM LEADER</p>
          <h1>{activeView === 'overview' ? 'Welcome back' : activeView === 'requests' ? 'Certificate requests' : activeView === 'myInterns' ? 'My interns' : 'Create an intern'}</h1>
          <p>{activeView === 'overview' ? 'Manage your team from one secure workspace.' : activeView === 'requests' ? 'Review intern requests waiting for your decision.' : activeView === 'myInterns' ? 'View the interns assigned to your team.' : 'Complete the details below to create an intern account.'}</p>
        </header>

        {activeView === 'overview' ? (
          <>
          <section className="admin-profile-card" aria-label="Team leader profile">
            <div className="admin-profile-heading"><div className="admin-profile-avatar">{initials}</div><div><p className="admin-eyebrow">YOUR PROFILE</p><h2>{user?.fullName || 'Team Leader'}</h2><p>{user?.email || 'Loading profile...'}</p></div></div>
            <div className="admin-profile-details">
              <div><span>Role</span><strong>{user?.role || 'teamleader'}</strong></div>
              <div><span>Mobile number</span><strong>{user?.mobileNo || 'Not provided'}</strong></div>
              <div><span>Member since</span><strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</strong></div>
            </div>
            <div className="admin-quick-actions"><button onClick={() => setActiveView('intern')}><span>＋</span><strong>Create Intern</strong><small>Register an intern for your team</small></button></div>
          </section>
          <div><UpcomingCompletions interns={upcomingCompletions} /></div>
          </>
        ) : activeView === 'requests' ? <PendingReviewList /> : activeView === 'myInterns' ? <MyInternsList /> : <div className="teamleader-form-grid"><CreateIntern /></div>}
      </main>
    </div>
  );
};

export default TLDashboard;

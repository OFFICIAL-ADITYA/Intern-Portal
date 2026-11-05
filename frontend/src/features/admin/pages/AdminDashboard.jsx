import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import NotificationBell from '../../../shared/components/NotificationBell';

import CreateIntern from '../components/CreateIntern';
import CreateTl from '../components/CreateTl';
import ForwardedRequestsList from '../components/ForwardedRequestsList';
import TeamLeadersSection from '../components/TeamLeadersSection';
import CertificatesOverview from '../components/CertificatesOverview';
import AdminInternsList from '../components/AdminInternsList';
import AdminUpcomingCompletions from '../components/AdminUpcomingCompletions';
import RetentionManagement from '../components/RetentionManagement';

import AnalyticsView from '../analytics/pages/AnalyticsView';

import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeView, setActiveView] = useState('overview');
  const [requestFilterStatus, setRequestFilterStatus] = useState(null);

  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam) {
      setActiveView(viewParam);
    }
  }, [searchParams]);

  const initials = (user?.fullName || 'Admin')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const logout = () => {
    handleLogout();
    navigate('/login');
  };

  /*
   * Navigate to certificate template editor.
   */
  const openCertificateTemplates = () => {
    navigate('/admin/certificate-templates');
  };

  /*
   * Change dashboard view.
   */
  const changeView = (view) => {
    setActiveView(view);
  };

  /*
   * Dynamic page heading.
   */
  const getPageTitle = () => {
    switch (activeView) {
      case 'analytics':
        return 'Admin Analytics';

      case 'interns':
        return 'Intern Management';

      case 'teamleaders':
        return 'Team Leader Management';

      case 'intern':
        return 'Create an intern';

      case 'teamleader':
        return 'Create a team leader';

      case 'requests':
        return 'Certificate Requests';

      case 'certificates':
        return 'Issued Certificates';

      case 'retention':
        return 'Account Retention';

      case 'overview':
      default:
        return 'Welcome back';
    }
  };

  /*
   * Dynamic page description.
   */
  const getPageDescription = () => {
    switch (activeView) {
      case 'analytics':
        return 'Comprehensive performance metrics, issuance speed, team leader bottlenecks, and analytics.';

      case 'interns':
        return 'View, edit, and assign or reassign all interns across Team Leaders.';

      case 'teamleaders':
        return 'View, search, and manage all Team Leaders and their assigned intern teams.';

      case 'intern':
        return 'Complete the details below to create a new intern account.';

      case 'teamleader':
        return 'Complete the details below to create a new team leader account.';

      case 'requests':
        return 'Finalize certificate requests forwarded by Team Leaders.';

      case 'certificates':
        return 'Audit and manage all generated certificates across the portal.';

      case 'retention':
        return 'Set archive and purge periods, review archived interns, and restore accounts.';

      case 'overview':
      default:
        return 'Manage your portal accounts, certificates, templates, and administration from one secure workspace.';
    }
  };

  return (
    <div className="admin-dashboard-shell">

      {/* =========================================================
          TOP BAR
      ========================================================== */}
      <header className="admin-topbar">

        <div className="admin-brand">
          <span className="admin-brand-icon">UP</span>
          <strong>uptoskills</strong>
        </div>

        <div className="admin-topbar-user">
          <NotificationBell userRole="admin" onNavigateTab={(view) => setActiveView(view)} />

          <div className="admin-avatar">
            {initials}
          </div>

          <div>
            <strong>
              {user?.fullName || 'Administrator'}
            </strong>

            <small>
              {user?.email || 'Loading profile...'}
            </small>
          </div>

          <button
            type="button"
            className="admin-logout"
            onClick={logout}
            title="Sign out"
          >
            <span>↩</span>
            Logout
          </button>

        </div>
      </header>


      {/* =========================================================
          SIDEBAR
      ========================================================== */}
      <aside
        className="admin-sidebar"
        aria-label="Admin navigation"
      >

        <p className="admin-sidebar-label">
          Workspace
        </p>

        <nav className="admin-sidebar-nav">

          {/* Overview */}
          <button
            type="button"
            className={`admin-nav-item ${
              activeView === 'overview' ? 'active' : ''
            }`}
            onClick={() => changeView('overview')}
          >
            <span>▦</span>
            Overview
          </button>


          {/* Analytics */}
          <button
            type="button"
            className={`admin-nav-item ${
              activeView === 'analytics' ? 'active' : ''
            }`}
            onClick={() => changeView('analytics')}
          >
            <span>📊</span>
            Admin Analytics
          </button>


          {/* Intern Management */}
          <button
            type="button"
            className={`admin-nav-item ${
              activeView === 'interns' ? 'active' : ''
            }`}
            onClick={() => changeView('interns')}
          >
            <span>👥</span>
            Intern Management
          </button>


          {/* Team Leaders */}
          <button
            type="button"
            className={`admin-nav-item ${
              activeView === 'teamleaders' ? 'active' : ''
            }`}
            onClick={() => changeView('teamleaders')}
          >
            <span>👔</span>
            Team Leaders
          </button>


          {/* Create Intern */}
          <button
            type="button"
            className={`admin-nav-item ${
              activeView === 'intern' ? 'active' : ''
            }`}
            onClick={() => changeView('intern')}
          >
            <span>＋</span>
            Create Intern
          </button>


          {/* Create Team Leader */}
          <button
            type="button"
            className={`admin-nav-item ${
              activeView === 'teamleader' ? 'active' : ''
            }`}
            onClick={() => changeView('teamleader')}
          >
            <span>♙</span>
            Create Team Leader
          </button>


          {/* Certificate Requests */}
          <button
            type="button"
            className={`admin-nav-item ${
              activeView === 'requests' ? 'active' : ''
            }`}
            onClick={() => changeView('requests')}
          >
            <span>▤</span>
            Certificate Requests
          </button>


          {/* Issued Certificates */}
          <button
            type="button"
            className={`admin-nav-item ${
              activeView === 'certificates' ? 'active' : ''
            }`}
            onClick={() => changeView('certificates')}
          >
            <span>📜</span>
            Issued Certificates
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeView === 'retention' ? 'active' : ''}`}
            onClick={() => changeView('retention')}
          >
            <span>♻</span>
            Account Retention
          </button>


          {/* =====================================================
              CERTIFICATE TEMPLATES
          ====================================================== */}
          <button
            type="button"
            className="admin-nav-item"
            onClick={openCertificateTemplates}
          >
            <span>🎨</span>
            Certificate Templates
          </button>

          {/* =====================================================
              AUDIT LOGS
          ====================================================== */}
          <button
            type="button"
            className="admin-nav-item"
            onClick={() => navigate('/admin/audit-logs')}
          >
            <span>📋</span>
            Audit Logs
          </button>

        </nav>


        <div className="admin-sidebar-note">
          <span>●</span>
          Admin access enabled
        </div>

      </aside>


      {/* =========================================================
          MAIN CONTENT
      ========================================================== */}
      <main className="admin-dashboard-main">

        {/* Page Header */}
        <header className="admin-page-header">

          <p className="admin-eyebrow">
            ADMINISTRATION
          </p>

          <h1>
            {getPageTitle()}
          </h1>

          <p>
            {getPageDescription()}
          </p>

        </header>


        {/* =======================================================
            ANALYTICS
        ======================================================== */}
        {activeView === 'analytics' ? (

          <AnalyticsView
            onOpenRequests={(status) => {
              setRequestFilterStatus(status || null);
              changeView('requests');
            }}
          />

        ) : activeView === 'overview' ? (

          /* =====================================================
             OVERVIEW
          ====================================================== */
          <>

            <section
              className="admin-profile-card"
              aria-label="Administrator profile"
            >

              {/* Profile heading */}
              <div className="admin-profile-heading">

                <div className="admin-profile-avatar">
                  {initials}
                </div>

                <div>
                  <p className="admin-eyebrow">
                    YOUR PROFILE
                  </p>

                  <h2>
                    {user?.fullName ||
                      'Administrator'}
                  </h2>

                  <p>
                    {user?.email ||
                      'Loading profile...'}
                  </p>
                </div>

              </div>


              {/* Profile details */}
              <div className="admin-profile-details">

                <div>
                  <span>Role</span>

                  <strong>
                    {user?.role || 'admin'}
                  </strong>
                </div>

                <div>
                  <span>Mobile number</span>

                  <strong>
                    {user?.mobileNo ||
                      'Not provided'}
                  </strong>
                </div>

                <div>
                  <span>Member since</span>

                  <strong>
                    {user?.createdAt
                      ? new Date(
                          user.createdAt
                        ).toLocaleDateString(
                          'en-US',
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }
                        )
                      : '—'}
                  </strong>
                </div>

              </div>


              {/* =================================================
                  QUICK ACTIONS
              ================================================== */}
              <div className="admin-quick-actions">

                <button
                  type="button"
                  onClick={() =>
                    changeView('analytics')
                  }
                >
                  <span>📊</span>
                  <strong>
                    Admin Analytics
                  </strong>
                  <small>
                    View bottlenecks & metrics
                  </small>
                </button>


                <button
                  type="button"
                  onClick={() =>
                    changeView('interns')
                  }
                >
                  <span>👥</span>
                  <strong>
                    Intern Management
                  </strong>
                  <small>
                    Manage interns & TL
                    assignments
                  </small>
                </button>


                <button
                  type="button"
                  onClick={() =>
                    changeView('teamleaders')
                  }
                >
                  <span>👔</span>
                  <strong>
                    Team Leaders
                  </strong>
                  <small>
                    Oversee all team leaders
                  </small>
                </button>


                <button
                  type="button"
                  onClick={() =>
                    changeView('intern')
                  }
                >
                  <span>＋</span>
                  <strong>
                    Create Intern
                  </strong>
                  <small>
                    Register a new intern
                    account
                  </small>
                </button>


                <button
                  type="button"
                  onClick={() =>
                    changeView('teamleader')
                  }
                >
                  <span>♙</span>
                  <strong>
                    Create Team Leader
                  </strong>
                  <small>
                    Add a team leader to
                    the portal
                  </small>
                </button>


                {/* =================================================
                    NEW: CERTIFICATE TEMPLATE CARD
                ================================================== */}
                <button
                  type="button"
                  onClick={
                    openCertificateTemplates
                  }
                >
                  <span>🎨</span>

                  <strong>
                    Certificate Templates
                  </strong>

                  <small>
                    Design & manage certificate
                    templates
                  </small>
                </button>

              </div>

            </section>


            {/* Upcoming completions */}
            <AdminUpcomingCompletions />

          </>

        ) : activeView === 'interns' ? (

          /* =====================================================
             INTERN MANAGEMENT
          ====================================================== */
          <AdminInternsList />

        ) : activeView === 'teamleaders' ? (

          /* =====================================================
             TEAM LEADERS
          ====================================================== */
          <TeamLeadersSection />

        ) : activeView === 'intern' ? (

          /* =====================================================
             CREATE INTERN
          ====================================================== */
          <CreateIntern />

        ) : activeView === 'teamleader' ? (

          /* =====================================================
             CREATE TEAM LEADER
          ====================================================== */
          <CreateTl />

        ) : activeView === 'certificates' ? (

          /* =====================================================
             ISSUED CERTIFICATES
          ====================================================== */
          <CertificatesOverview />

        ) : activeView === 'retention' ? (

          <RetentionManagement />

        ) : (

          /* =====================================================
             CERTIFICATE REQUESTS
          ====================================================== */
          <ForwardedRequestsList
            statusFilter={requestFilterStatus}
            onClearStatusFilter={() => setRequestFilterStatus(null)}
          />

        )}

      </main>

    </div>
  );
};

export default AdminDashboard;

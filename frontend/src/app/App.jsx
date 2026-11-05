import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Login from '../features/auth/pages/Login';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';
import VerifyPage from '../features/public/pages/VerifyPage';

import ProtectedRoute from '../features/shared/components/ProtectedRoute';
import ThemeToggle from '../features/shared/components/ThemeToggle';
import AccessDeniedPage from '../features/shared/pages/AccessDeniedPage';
import ErrorBoundary from '../features/shared/components/ErrorBoundary';

import './App.css';

// Lazy-load dashboard and heavy editor/chart pages so intern pages do not bundle Recharts and GrapesJS
const InternDashboard = lazy(() => import('../features/intern/pages/InternDashboard'));
const TLDashboard = lazy(() => import('../features/teamleader/pages/TLDashboard'));
const AdminDashboard = lazy(() => import('../features/admin/pages/AdminDashboard'));
const CertificateReviewPage = lazy(() => import('../features/admin/pages/CertificateReviewPage'));
const CertificateTemplateEditorPage = lazy(() => import('../features/admin/pages/CertificateTemplateEditorPage'));
const AuditLogsPage = lazy(() => import('../features/admin/pages/AuditLogsPage'));

function RouteLoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '12px',
        color: 'var(--text-primary, inherit)'
      }}
      aria-live="polite"
      aria-label="Loading page content"
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid rgba(37, 99, 235, 0.2)',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'routeSpin 0.8s linear infinite'
        }}
      />
      <style>{`@keyframes routeSpin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Loading...</span>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((previousTheme) =>
      previousTheme === 'dark' ? 'light' : 'dark'
    );
  };

  return (
    <ErrorBoundary>
      <ThemeToggle
        theme={theme}
        onToggle={toggleTheme}
      />

      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* =========================
              PUBLIC ROUTES
          ========================== */}

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/forgot-password"
            element={<ForgotPasswordPage />}
          />

          <Route
            path="/reset-password/:token"
            element={<ResetPasswordPage />}
          />

          <Route
            path="/verify/:verifyId"
            element={<VerifyPage />}
          />

          <Route
            path="/unauthorized"
            element={<AccessDeniedPage />}
          />

          <Route
            path="/access-denied"
            element={<AccessDeniedPage />}
          />

          {/* =========================
              INTERN ROUTES
          ========================== */}

          <Route
            element={
              <ProtectedRoute allowedRoles={['intern']} />
            }
          >
            <Route
              path="/intern/dashboard"
              element={<InternDashboard />}
            />
          </Route>

          {/* =========================
              TEAM LEADER ROUTES
          ========================== */}

          <Route
            element={
              <ProtectedRoute allowedRoles={['teamleader']} />
            }
          >
            <Route
              path="/teamleader/dashboard"
              element={<TLDashboard />}
            />
          </Route>

          {/* =========================
              ADMIN ROUTES
          ========================== */}

          <Route
            element={
              <ProtectedRoute allowedRoles={['admin']} />
            }
          >
            <Route
              path="/admin/dashboard"
              element={<AdminDashboard />}
            />

            <Route
              path="/admin/certificates/:id/review"
              element={<CertificateReviewPage />}
            />

            <Route
              path="/admin/certificate-templates"
              element={<CertificateTemplateEditorPage />}
            />

            <Route
              path="/admin/audit-logs"
              element={<AuditLogsPage />}
            />
          </Route>

          {/* =========================
              DEFAULT ROUTES
          ========================== */}

          <Route
            path="/"
            element={<Navigate to="/login" replace />}
          />

          <Route
            path="*"
            element={<Navigate to="/login" replace />}
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

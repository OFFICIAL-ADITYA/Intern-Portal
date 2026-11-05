import React, { useState } from 'react';
import useNotifications from '../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';
import Toast from './Toast';
import './NotificationBell.css';

/**
 * Shared Notification Bell component with live badge, polling, toast alert, and dropdown.
 *
 * @param {Object} props
 * @param {string} [props.userRole] - Current user role ('intern' | 'teamleader' | 'admin')
 * @param {function} [props.onNavigateTab] - Callback to switch views if already on dashboard
 */
export default function NotificationBell({ userRole, onNavigateTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    error,
    toastNotification,
    clearToast,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const badgeDisplay = unreadCount > 9 ? '9+' : unreadCount;

  return (
    <div className="notif-bell-container">
      {/* Toast Alert for new incoming notifications */}
      {toastNotification && (
        <div className="notif-toast-wrapper">
          <Toast
            type="info"
            message={toastNotification}
            onClose={clearToast}
          />
        </div>
      )}

      <button
        type="button"
        className={`notif-bell-btn ${isOpen ? 'is-active' : ''}`}
        onClick={handleToggle}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Notifications"
      >
        <svg
          className="notif-bell-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {badgeDisplay}
          </span>
        )}
      </button>

      <NotificationDropdown
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        error={error}
        isOpen={isOpen}
        onClose={handleClose}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onRetry={fetchNotifications}
        userRole={userRole}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
}

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './NotificationDropdown.css';

/**
 * Format relative time (e.g., 'Just now', '5m ago', '2h ago', 'Yesterday', 'Oct 15').
 */
function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

function getEventIcon(type) {
  switch (type) {
    case 'REQUEST_SUBMITTED':
      return '📥';
    case 'REQUEST_FORWARDED':
      return '↗️';
    case 'REQUEST_APPROVED':
      return '✅';
    case 'REQUEST_REJECTED':
      return '❌';
    case 'CERTIFICATE_SENT':
      return '📜';
    case 'ARCHIVE_WARNING':
      return '⚠️';
    default:
      return '🔔';
  }
}

export default function NotificationDropdown({
  notifications,
  unreadCount,
  loading,
  error,
  isOpen,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onRetry,
  userRole,
  onNavigateTab
}) {
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Handle outside click and Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNotificationClick = (item) => {
    // 1. Mark as read if not yet read
    if (!item.isRead) {
      onMarkAsRead(item._id);
    }

    // 2. Navigate based on user role
    // Intern -> My Requests (tab 'certificates')
    // Team Leader -> Pending Review (view 'requests')
    // Admin -> Forwarded Requests (view 'requests')
    const role = (userRole || '').toLowerCase();

    if (onNavigateTab) {
      if (role === 'intern') onNavigateTab('certificates');
      else if (role === 'teamleader') onNavigateTab('requests');
      else if (role === 'admin') onNavigateTab('requests');
    }

    if (role === 'intern') {
      navigate('/intern/dashboard?tab=certificates');
    } else if (role === 'teamleader') {
      navigate('/teamleader/dashboard?view=requests');
    } else if (role === 'admin') {
      navigate('/admin/dashboard?view=requests');
    }

    onClose();
  };

  return (
    <div
      className="notif-dropdown"
      ref={dropdownRef}
      role="region"
      aria-label="Notifications list"
    >
      <header className="notif-header">
        <div className="notif-header-title">
          <h3>Notifications</h3>
          {unreadCount > 0 && (
            <span className="notif-unread-tag">{unreadCount} unread</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="notif-mark-all-btn"
            onClick={onMarkAllAsRead}
          >
            Mark all read
          </button>
        )}
      </header>

      <div className="notif-body">
        {loading ? (
          <div className="notif-skeleton-list" aria-busy="true" aria-label="Loading notifications">
            {[1, 2, 3].map((n) => (
              <div key={n} className="notif-skeleton-item">
                <div className="notif-skeleton-dot" />
                <div className="notif-skeleton-content">
                  <div className="notif-skeleton-line short" />
                  <div className="notif-skeleton-line long" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="notif-state notif-error-state">
            <span className="notif-state-icon">⚠️</span>
            <p>{error}</p>
            {onRetry && (
              <button type="button" className="notif-retry-btn" onClick={onRetry}>
                Try again
              </button>
            )}
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="notif-state notif-empty-state">
            <span className="notif-state-icon">🎉</span>
            <p className="notif-empty-title">You're all caught up</p>
            <p className="notif-empty-desc">No new notifications right now.</p>
          </div>
        ) : (
          <ul className="notif-list" role="list">
            {notifications.map((item) => {
              const isUnread = !item.isRead;
              return (
                <li
                  key={item._id}
                  className={`notif-item ${isUnread ? 'is-unread' : 'is-read'}`}
                  onClick={() => handleNotificationClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(item);
                    }
                  }}
                  title={new Date(item.createdAt).toLocaleString()}
                >
                  <span className="notif-item-icon" aria-hidden="true">
                    {getEventIcon(item.type)}
                  </span>
                  <div className="notif-item-content">
                    <div className="notif-item-header">
                      <strong className="notif-item-title">{item.title}</strong>
                      <span className="notif-item-time" title={new Date(item.createdAt).toLocaleString()}>
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>
                    <p className="notif-item-message">{item.message}</p>
                  </div>
                  {isUnread && (
                    <span className="notif-unread-dot" title="Unread notification" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

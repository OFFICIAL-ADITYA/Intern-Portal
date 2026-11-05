import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} from '../services/notification.service';

/**
 * Custom hook to manage notifications, unread count polling, and Toast alerts.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);

  // Keep track of previous unread count to detect increases
  const initialFetchDone = useRef(false);
  const previousUnreadCountRef = useRef(0);

  /**
   * Fetch unread count for badge
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      const count = typeof data.unreadCount === 'number' ? data.unreadCount : (data.count || 0);

      // Trigger toast only when count increases after initial load
      if (initialFetchDone.current && count > previousUnreadCountRef.current) {
        const diff = count - previousUnreadCountRef.current;
        setToastNotification(
          diff === 1 ? 'You have a new notification.' : `You have ${diff} new notifications.`
        );
      }

      previousUnreadCountRef.current = count;
      initialFetchDone.current = true;
      setUnreadCount(count);
      return count;
    } catch (err) {
      // Avoid hard-failing polling quietly
      console.warn('Failed to fetch unread notification count:', err.message);
      return null;
    }
  }, []);

  /**
   * Fetch notification list
   */
  const fetchNotifications = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications(params);
      const list = Array.isArray(data) ? data : (data.notifications || []);
      setNotifications(list);
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
        previousUnreadCountRef.current = data.unreadCount;
      }
      return list;
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Mark a single notification as read
   */
  const handleMarkAsRead = useCallback(async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item._id === id ? { ...item, isRead: true, readAt: new Date() } : item))
      );
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1);
        previousUnreadCountRef.current = next;
        return next;
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true, readAt: new Date() }))
      );
      setUnreadCount(0);
      previousUnreadCountRef.current = 0;
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, []);

  const clearToast = useCallback(() => {
    setToastNotification(null);
  }, []);

  // Poll unread count every 30 seconds; pause when tab is hidden
  useEffect(() => {
    fetchUnreadCount();

    let intervalId = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (!document.hidden) {
            fetchUnreadCount();
          }
        }, 30000);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Tab became visible again: refresh immediately and resume polling
        fetchUnreadCount();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    toastNotification,
    clearToast,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead
  };
}

export default useNotifications;

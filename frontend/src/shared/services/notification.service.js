import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const notificationApi = axios.create({
  baseURL: `${API_BASE_URL}/api/notifications`,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

/**
 * Fetches notifications for current user with optional unread filter and pagination.
 */
export const getNotifications = async ({ unread = false, page = 1, limit = 20 } = {}) => {
  const response = await notificationApi.get('', {
    params: {
      unread: unread ? 'true' : undefined,
      page,
      limit
    }
  });
  return response.data;
};

/**
 * Fetches unread notifications count for current user's bell badge.
 */
export const getUnreadCount = async () => {
  const response = await notificationApi.get('/unread-count');
  return response.data;
};

/**
 * Marks a single notification as read.
 */
export const markAsRead = async (id) => {
  const response = await notificationApi.patch(`/${id}/read`);
  return response.data;
};

/**
 * Marks all notifications as read for current user.
 */
export const markAllAsRead = async () => {
  const response = await notificationApi.patch('/read-all');
  return response.data;
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};

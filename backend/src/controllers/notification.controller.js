import mongoose from 'mongoose';
import Notification from '../models/Notification.model.js';

/**
 * GET /api/notifications
 * Lists current user's notifications with optional unread filter and pagination.
 */
export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { unread, page = 1, limit = 20 } = req.query;

    const query = { userId };
    if (unread === 'true' || unread === true) {
      query.isRead = false;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, isRead: false })
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      notifications,
      total,
      page: pageNum,
      totalPages,
      unreadCount
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * GET /api/notifications/unread-count
 * Returns unread notifications count for the current user's bell badge.
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false
    });

    return res.status(200).json({
      unreadCount,
      count: unreadCount
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read.
 * Returns 404 if not found or belongs to another user.
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const notification = await Notification.findOne({
      _id: id,
      userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return res.status(200).json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications for current user as read.
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    await Notification.updateMany(
      { userId, isRead: false },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    return res.status(200).json({
      message: 'All notifications marked as read'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

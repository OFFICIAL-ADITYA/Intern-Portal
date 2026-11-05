import { Router } from 'express';
import verifyAuth from '../middlewares/verifyAuth.js';
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../controllers/notification.controller.js';

const notificationRouter = Router();

// Behind verifyAuth only, no role check (available to admin, intern, teamleader)
notificationRouter.use(verifyAuth);

notificationRouter.get('/', getMyNotifications);
notificationRouter.get('/unread-count', getUnreadCount);
notificationRouter.patch('/:id/read', markNotificationAsRead);
notificationRouter.patch('/read-all', markAllNotificationsAsRead);

export default notificationRouter;

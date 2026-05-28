import type { Request, Response } from 'express';
import { NotificationModel } from '../models/index';

export async function listNotifications(req: Request, res: Response) {
  const notifications = await NotificationModel.find().sort({ createdAt: -1 }).lean();
  if (!req.authUser) {
    return res.json(notifications);
  }

  const visibleNotifications = notifications.filter((notification) => notification.recipientRole === 'all' || notification.recipientRole === req.authUser.role);
  return res.json(visibleNotifications);
}

export async function markNotificationRead(req: Request, res: Response) {
  if (!req.authUser) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const notification = await NotificationModel.findOne({ id: req.params.id });
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found.' });
  }

  if (!notification.readBy.includes(req.authUser.uid)) {
    notification.readBy.push(req.authUser.uid);
    await notification.save();
  }

  return res.json(notification);
}

export async function clearNotifications(_req: Request, res: Response) {
  await NotificationModel.deleteMany({});
  return res.json({ success: true });
}

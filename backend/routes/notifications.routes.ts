import { Router } from 'express';
import { clearNotifications, listNotifications, markNotificationRead } from '../controllers/notifications.controller';
import { authenticateRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateRequest, listNotifications);
router.patch('/:id/read', authenticateRequest, markNotificationRead);
router.delete('/', authenticateRequest, clearNotifications);

export default router;

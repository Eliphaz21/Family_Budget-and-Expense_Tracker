import { Router } from 'express';
import { getStats } from '../controllers/stats.controller';
import { authenticateRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateRequest, getStats);

export default router;

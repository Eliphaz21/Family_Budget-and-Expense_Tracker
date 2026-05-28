import { Router } from 'express';
import { listAllowances, upsertAllowance } from '../controllers/allowances.controller';
import { authenticateRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateRequest, listAllowances);
router.post('/', authenticateRequest, upsertAllowance);

export default router;

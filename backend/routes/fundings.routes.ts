import { Router } from 'express';
import { createFunding, listFundings } from '../controllers/fundings.controller';
import { authenticateRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateRequest, listFundings);
router.post('/', authenticateRequest, createFunding);

export default router;

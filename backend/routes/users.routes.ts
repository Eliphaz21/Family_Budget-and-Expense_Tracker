import { Router } from 'express';
import { listUsers } from '../controllers/users.controller';
import { authenticateRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateRequest, listUsers);

export default router;

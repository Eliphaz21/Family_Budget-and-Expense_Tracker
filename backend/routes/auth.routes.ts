import { Router } from 'express';
import { login, me, register } from '../controllers/auth.controller';
import { authenticateRequest } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateRequest, me);

export default router;

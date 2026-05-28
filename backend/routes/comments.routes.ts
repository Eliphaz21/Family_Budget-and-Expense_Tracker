import { Router } from 'express';
import { createComment, listComments } from '../controllers/comments.controller';
import { authenticateRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateRequest, listComments);
router.post('/', authenticateRequest, createComment);

export default router;

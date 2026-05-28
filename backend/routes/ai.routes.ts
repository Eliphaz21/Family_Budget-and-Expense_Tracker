import { Router } from 'express';
import { analyzeBudget, chatBudget } from '../controllers/ai.controller';

const router = Router();

router.post('/analyze', analyzeBudget);
router.post('/chat', chatBudget);

export default router;

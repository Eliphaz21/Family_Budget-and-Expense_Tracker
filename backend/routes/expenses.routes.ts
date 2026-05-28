import { Router } from 'express';
import { createExpense, deleteExpense, listExpenses } from '../controllers/expenses.controller';
import { authenticateRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateRequest, listExpenses);
router.post('/', authenticateRequest, createExpense);
router.delete('/:id', authenticateRequest, deleteExpense);

export default router;

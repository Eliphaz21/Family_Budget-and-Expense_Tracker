import type { Request, Response } from 'express';
import { ExpenseModel } from '../models/index';
import { loadCurrentMonthBudget, toExpenseStats } from '../services/ledger.service';

export async function getStats(req: Request, res: Response) {
  const month = typeof req.query.month === 'string' ? req.query.month : new Date().toISOString().slice(0, 7);
  const allowanceAmount = await loadCurrentMonthBudget(month);
  const expenses = await ExpenseModel.find({ date: new RegExp(`^${month}`) }).lean();
  const stats = toExpenseStats(expenses, allowanceAmount);

  return res.json(stats);
}

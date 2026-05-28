import type { Request, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { ExpenseModel, NotificationModel } from '../models/index';
import { buildExpenseAlert } from '../services/ledger.service';

const expenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  productName: z.string().optional(),
  category: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdByName: z.string().optional(),
});

export async function listExpenses(req: Request, res: Response) {
  const month = typeof req.query.month === 'string' ? req.query.month : undefined;
  const expenses = await ExpenseModel.find(month ? { date: new RegExp(`^${month}`) } : {}).sort({ createdAt: -1 }).lean();
  return res.json(expenses);
}

export async function createExpense(req: Request, res: Response) {
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success || !req.authUser) {
    return res.status(400).json({ error: 'Expense payload is invalid.' });
  }

  const creator = req.authUser;
  const expense = {
    id: `exp_${randomUUID()}`,
    amount: parsed.data.amount,
    description: parsed.data.description.trim(),
    productName: parsed.data.productName?.trim() || undefined,
    category: parsed.data.category.trim(),
    date: parsed.data.date,
    createdAt: new Date().toISOString(),
    createdBy: creator.uid,
    createdByName: parsed.data.createdByName?.trim() || creator.displayName,
  };

  const createdExpense = await ExpenseModel.create(expense);
  if (expense.amount > 3000) {
    await NotificationModel.create(buildExpenseAlert(expense));
  }

  return res.status(201).json(createdExpense);
}

export async function deleteExpense(req: Request, res: Response) {
  const deleted = await ExpenseModel.findOneAndDelete({ id: req.params.id });
  if (!deleted) {
    return res.status(404).json({ error: 'Expense not found.' });
  }

  return res.json({ success: true });
}

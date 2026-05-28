import type { Request, Response } from 'express';
import { generateBudgetAnalysis, generateChatReply } from '../services/ai.service';

export async function analyzeBudget(req: Request, res: Response) {
  const { expenses, allowance, currentMonth } = req.body || {};
  if (!Array.isArray(expenses)) {
    return res.status(400).json({ error: 'Expenses list is required' });
  }

  const report = await generateBudgetAnalysis(expenses, allowance || 15000, currentMonth || 'this month');
  return res.json(report);
}

export async function chatBudget(req: Request, res: Response) {
  const { message, history, database } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const response = await generateChatReply(message, history || [], database || {});
  return res.json({ response });
}

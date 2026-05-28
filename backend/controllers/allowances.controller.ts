import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { AllowanceModel, NotificationModel } from '../models/index';
import { buildNotification } from '../services/ledger.service';

const allowanceSchema = z.object({
  amount: z.number().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  notes: z.string().optional(),
});

export async function listAllowances(_req: Request, res: Response) {
  const allowances = await AllowanceModel.find().sort({ month: -1 }).lean();
  return res.json(allowances);
}

export async function upsertAllowance(req: Request, res: Response) {
  const parsed = allowanceSchema.safeParse(req.body);
  if (!parsed.success || !req.authUser) {
    return res.status(400).json({ error: 'Allowance payload is invalid.' });
  }

  const allowance = {
    id: `allowance_${randomUUID()}`,
    amount: parsed.data.amount,
    month: parsed.data.month,
    notes: parsed.data.notes?.trim() || `Updated House envelope budget for ${parsed.data.month}.`,
    createdAt: new Date().toISOString(),
    createdBy: req.authUser.uid,
  };

  const updatedAllowance = await AllowanceModel.findOneAndUpdate({ month: allowance.month }, allowance, { upsert: true, new: true }).lean();
  await NotificationModel.create(buildNotification(`⚙️ Base Monthly House Allowance for ${allowance.month} was set to: ${allowance.amount.toLocaleString()} Birr by ${req.authUser.displayName}.`, 'sister'));

  return res.status(201).json(updatedAllowance);
}

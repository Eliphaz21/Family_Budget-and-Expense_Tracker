import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { FundingModel, NotificationModel } from '../models/index';
import { buildNotification } from '../services/ledger.service';

const fundingSchema = z.object({
  amount: z.number().positive(),
  source: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  screenshot: z.string().optional(),
});

export async function listFundings(req: Request, res: Response) {
  const month = typeof req.query.month === 'string' ? req.query.month : undefined;
  const fundings = await FundingModel.find(month ? { date: new RegExp(`^${month}`) } : {}).sort({ createdAt: -1 }).lean();
  return res.json(fundings);
}

export async function createFunding(req: Request, res: Response) {
  const parsed = fundingSchema.safeParse(req.body);
  if (!parsed.success || !req.authUser) {
    return res.status(400).json({ error: 'Funding payload is invalid.' });
  }

  const funding = {
    id: `fund_${randomUUID()}`,
    amount: parsed.data.amount,
    source: parsed.data.source.trim(),
    date: parsed.data.date,
    notes: parsed.data.notes?.trim(),
    screenshot: parsed.data.screenshot,
    createdAt: new Date().toISOString(),
    createdBy: req.authUser.uid,
    createdByName: req.authUser.displayName,
  };

  const createdFunding = await FundingModel.create(funding);
  await NotificationModel.create(buildNotification(`💸 Money Added: ${req.authUser.displayName} logged ${funding.amount.toLocaleString()} Birr top-off for ${funding.date} (Ref: ${funding.source}).`, 'all'));

  return res.status(201).json(createdFunding);
}

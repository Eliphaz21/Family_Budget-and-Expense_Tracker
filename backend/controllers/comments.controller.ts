import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { CommentModel, NotificationModel } from '../models/index';
import { buildNotification } from '../services/ledger.service';

const commentSchema = z.object({
  type: z.enum(['comment', 'request', 'contribution']),
  text: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expenseId: z.string().optional(),
});

export async function listComments(req: Request, res: Response) {
  const date = typeof req.query.date === 'string' ? req.query.date : undefined;
  const comments = await CommentModel.find(date ? { date } : {}).sort({ createdAt: -1 }).lean();
  return res.json(comments);
}

export async function createComment(req: Request, res: Response) {
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success || !req.authUser) {
    return res.status(400).json({ error: 'Comment payload is invalid.' });
  }

  const comment = {
    id: `com_${randomUUID()}`,
    type: parsed.data.type,
    text: parsed.data.text.trim(),
    expenseId: parsed.data.expenseId,
    date: parsed.data.date,
    authorName: req.authUser.displayName,
    createdBy: req.authUser.uid,
    createdAt: new Date().toISOString(),
  };

  const createdComment = await CommentModel.create(comment);
  await NotificationModel.create(buildNotification(`💬 Pinned Message${comment.date ? ` at ${comment.date}` : ''} by ${req.authUser.displayName}: "${comment.text.length > 40 ? `${comment.text.substring(0, 40)}...` : comment.text}"`, 'all'));

  return res.status(201).json(createdComment);
}

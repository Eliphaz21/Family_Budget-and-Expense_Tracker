import type { Request, Response } from 'express';
import { UserModel } from '../models/index';
import { toPublicUser } from '../services/auth.service';

export async function listUsers(_req: Request, res: Response) {
  const users = await UserModel.find().sort({ createdAt: -1 }).lean();
  return res.json(users.map(toPublicUser));
}

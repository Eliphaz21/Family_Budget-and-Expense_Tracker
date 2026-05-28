import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { UserModel } from '../models/index';
import { signUserToken, toPublicUser } from '../services/auth.service';
import type { UserRecord } from '../types/domain';

const registerSchema = z.object({
  displayName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['sister', 'user']).default('user'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Name, email, password, and role are required.' });
  }

  const { displayName, email, password, role } = parsed.data;
  const existing = await UserModel.findOne({ email: email.toLowerCase().trim() }).lean();
  if (existing) {
    return res.status(400).json({ error: 'A user with this email already exists.' });
  }

  const newUser: UserRecord = {
    uid: `user_${Date.now()}`,
    email: email.toLowerCase().trim(),
    displayName: displayName.trim(),
    role,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
  };

  await UserModel.create(newUser);

  return res.status(201).json({ token: signUserToken(newUser), user: toPublicUser(newUser) });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const { email, password } = parsed.data;
  const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const userRecord = user.toObject() as UserRecord;
  return res.json({ token: signUserToken(userRecord), user: toPublicUser(userRecord) });
}

export async function me(req: Request, res: Response) {
  const user = await UserModel.findOne({ uid: req.authUser?.uid }).lean();
  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  return res.json({ user: toPublicUser(user) });
}

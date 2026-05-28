import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../services/auth.service';
import type { AuthPayload } from '../types/domain';

export function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token missing or invalid format.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    req.authUser = jwt.verify(token, getJwtSecret()) as AuthPayload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token signature validation failed.' });
  }
}

import jwt from 'jsonwebtoken';
import type { UserRecord } from '../types/domain';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is missing. Add it to .env before starting the backend.');
  }

  return secret;
}

export function toPublicUser(user: Pick<UserRecord, 'uid' | 'email' | 'displayName' | 'role' | 'createdAt'>) {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function signUserToken(user: Pick<UserRecord, 'uid' | 'email' | 'displayName' | 'role'>) {
  return jwt.sign(
    {
      uid: user.uid,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

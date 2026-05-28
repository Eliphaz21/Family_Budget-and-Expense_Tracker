import type { AuthPayload } from './domain';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthPayload;
    }
  }
}

export {};

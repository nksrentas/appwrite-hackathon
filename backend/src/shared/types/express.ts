import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  username?: string;
  githubId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user: User;
}

// Extend Express Request interface globally
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
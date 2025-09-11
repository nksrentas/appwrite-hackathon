import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@shared/utils/logger';
import { User } from '@shared/types/express';


export interface JwtPayload {
  userId: string;
  email: string;
  username?: string;
  githubId?: string;
  iat?: number;
  exp?: number;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Access token required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Authentication service unavailable',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    // Create user object from JWT payload
    const user: User = {
      id: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      githubId: decoded.githubId,
      isActive: true, // Assume active if token is valid
      createdAt: new Date(), // Would normally come from database
      updatedAt: new Date()
    };

    req.user = user;
    
    logger.debug('User authenticated successfully', {
      userId: user.id,
      path: req.path,
      method: req.method
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token provided', {
        error: error.message,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid access token',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired token provided', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Access token expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    logger.error('Authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'AUTHENTICATION_ERROR',
      message: 'Authentication failed',
      timestamp: new Date().toISOString()
    });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided, continue without user
      next();
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      // JWT not configured, continue without user
      next();
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    const user: User = {
      id: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      githubId: decoded.githubId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    req.user = user;
    next();
  } catch (error) {
    // Token invalid, continue without user
    next();
  }
};

export default {
  authenticateToken,
  optionalAuth
};
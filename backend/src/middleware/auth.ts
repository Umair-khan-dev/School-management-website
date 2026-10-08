import { Request, Response, NextFunction } from 'express';
import { verifyJwt, JwtPayload, UserRole } from '../config/db.ts';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in to continue.',
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyJwt(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Session expired or invalid token. Please log in again.',
    });
  }

  req.user = decoded;
  next();
}

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
      });
    }
    next();
  };
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('[PinkEdu API Error]:', err);
  const statusCode = err.statusCode || 500;
  const friendlyMessage =
    err.isOperational && err.message
      ? err.message
      : 'Unable to process request due to an internal server error.';
  res.status(statusCode).json({
    success: false,
    message: friendlyMessage,
  });
}

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth';

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        message: 'Insufficient permissions. Required roles: ' + allowedRoles.join(', ') 
      });
      return;
    }

    next();
  };
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }

  next();
};

export const requireManagerOrAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
    res.status(403).json({ message: 'Manager or Admin access required' });
    return;
  }

  next();
};

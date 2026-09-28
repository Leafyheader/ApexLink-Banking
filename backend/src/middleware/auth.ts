import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types/auth';

const prisma = new PrismaClient();

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;

    // The JWT's signature being valid only proves it was issued by us - it says nothing about
    // whether the user is still allowed in *right now*. Without this check, deactivating or
    // deleting a user (see users.controller.ts) would not actually revoke their access until
    // their existing token happened to expire (up to JWT_EXPIRES_IN, currently 24h) - the token
    // itself carries no live status. Re-checking against the DB on every request costs one
    // indexed lookup but is what makes "deactivate this user" actually take effect immediately.
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { isActive: true }
    });

    if (!user) {
      res.status(401).json({ message: 'User no longer exists' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'This account has been deactivated. Contact an administrator.' });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid token' });
    return;
  }
};

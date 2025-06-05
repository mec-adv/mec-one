import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { type Request, type Response, type NextFunction } from 'express';
import { storage } from './storage';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    profile: string;
  };
}

export interface TokenPayload {
  userId: string;
  email: string;
  profile: string;
}

export function generateTokens(payload: TokenPayload) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  
  return { accessToken, refreshToken };
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTemporaryPassword(): string {
  return Math.random().toString(36).slice(-8);
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header provided' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Verify user still exists and is active
    const user = await storage.getUser(payload.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = {
      id: payload.userId,
      email: payload.email,
      profile: payload.profile,
    };

    // Log user activity
    await storage.createAuditLog({
      userId: payload.userId,
      action: 'API_ACCESS',
      table: 'users',
      recordId: payload.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
}

export function authorize(profiles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!profiles.includes(req.user.profile)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
}

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserRecord, db } from './db';
import type { AccountType } from '../../shared/booking';

const DEV_FALLBACK_SECRET = 'mobler-dev-only-secret-change-me';
const JWT_SECRET = process.env.JWT_SECRET || DEV_FALLBACK_SECRET;
const JWT_EXPIRES_IN = '30d';

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  console.warn('[auth] JWT_SECRET is not set — using an insecure development secret.');
}

export type Role = 'customer' | 'shop_owner' | 'shop_staff' | 'admin';

export interface AuthenticatedUserPayload {
  userId: string;
  accountType: AccountType;
  phone: string;
  email: string;
  name: string;
  roles: Role[];
  activeRole: Role;
  owned_shops: string[];
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUserPayload;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export function generateToken(user: UserRecord): string {
  const payload: AuthenticatedUserPayload = {
    userId: user.id,
    accountType: user.account_type,
    phone: user.phone,
    email: user.email,
    name: user.name,
    roles: user.roles,
    activeRole: user.activeRole || user.roles[0],
    owned_shops: user.owned_shops || []
  };
  // The audience pins a token to the app it was issued for.
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN, audience: `mobler-${user.account_type}` });
}

export function verifyToken(token: string): AuthenticatedUserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      audience: ['mobler-customer', 'mobler-shop']
    }) as AuthenticatedUserPayload;
    if (!decoded.accountType) return null;
    return decoded;
  } catch {
    return null;
  }
}

function readBearer(req: Request): string | undefined {
  const authHeader = req.headers['authorization'];
  return authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const token = readBearer(req);
  if (!token) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập', code: 'AUTH_REQUIRED' });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', code: 'TOKEN_INVALID' });
  }
  // Re-read ownership from the database so newly created shops are visible without re-login.
  const fresh = db.findUserById(decoded.userId);
  if (!fresh) {
    return res.status(401).json({ error: 'Tài khoản không còn tồn tại', code: 'TOKEN_INVALID' });
  }
  req.user = { ...decoded, roles: fresh.roles, owned_shops: fresh.owned_shops || [] };
  next();
}

export function optionalAuthenticateToken(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = readBearer(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) req.user = decoded;
  }
  next();
}

/** Restrict a route to accounts from one app (customer app vs shop app). */
export function requireAccount(type: AccountType) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Vui lòng đăng nhập', code: 'AUTH_REQUIRED' });
    if (req.user.accountType !== type) {
      return res.status(403).json({
        error: type === 'shop'
          ? 'Chức năng này chỉ dành cho tài khoản cửa hàng'
          : 'Chức năng này chỉ dành cho tài khoản khách hàng',
        code: 'WRONG_ACCOUNT_TYPE'
      });
    }
    next();
  };
}

export function isAdmin(user?: AuthenticatedUserPayload): boolean {
  return !!user?.roles?.includes('admin');
}

/** True when the shop account may manage the given shop. */
export function canManageShop(user: AuthenticatedUserPayload | undefined, shopId: string): boolean {
  if (!user || user.accountType !== 'shop') return false;
  return isAdmin(user) || (user.owned_shops || []).includes(shopId);
}

export function requireShopAccess(paramName = 'id') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const shopId = req.params[paramName];
    if (!canManageShop(req.user, shopId)) {
      return res.status(403).json({ error: 'Bạn không có quyền quản lý quán này', code: 'SHOP_FORBIDDEN' });
    }
    next();
  };
}

/** Tiny in-memory rate limiter for login/register endpoints. */
export function rateLimit(maxPerWindow: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > maxPerWindow) {
      return res.status(429).json({ error: 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút' });
    }
    next();
  };
}

import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { Store } from './db.js';
import { must } from './types.js';
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function checkPassword(password: string, value: string) {
  const [salt, expected] = value.split(':');
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const e = Buffer.from(expected, 'hex');
  return e.length === actual.length && timingSafeEqual(actual, e);
}
export type Session = {
  id: string;
  csrf: string;
  userId: string | null;
  email: string | null;
  role: 'guest' | 'buyer' | 'owner' | 'staff';
};
declare global {
  namespace Express {
    interface Request {
      session: Session;
    }
  }
}
export function attachSession(store: Store) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.rr_session;
    const existing =
      typeof token === 'string'
        ? store.one<any>(
            'SELECT s.*,u.email,u.role FROM sessions s LEFT JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires>?',
            hash(token),
            Date.now(),
          )
        : null;
    if (existing)
      req.session = {
        id: existing.id,
        csrf: existing.csrf,
        userId: existing.user_id,
        email: existing.email,
        role: existing.role || 'guest',
      };
    else {
      const t = randomBytes(32).toString('hex'),
        id = hash(t),
        csrf = randomBytes(24).toString('hex');
      store.run(
        'INSERT INTO sessions(id,csrf,expires) VALUES(?,?,?)',
        id,
        csrf,
        Date.now() + 7 * 86400000,
      );
      res.cookie('rr_session', t, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.SECURE_COOKIES === 'true',
        maxAge: 7 * 86400000,
        path: '/',
      });
      req.session = { id, csrf, userId: null, email: null, role: 'guest' };
    }
    next();
  };
}
export function merchant(req: Request, _res: Response, next: NextFunction) {
  must(
    req.session.role === 'owner' || req.session.role === 'staff',
    'Merchant sign-in required.',
    403,
  );
  next();
}
export function owner(req: Request, _res: Response, next: NextFunction) {
  must(req.session.role === 'owner', 'Merchant owner access required.', 403);
  next();
}
export function csrf(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  must(
    req.get('x-csrf-token') === req.session.csrf,
    'Session expired. Refresh and try again.',
    403,
  );
  const origin = req.get('origin');
  must(
    !origin || origin === new URL(process.env.APP_URL || 'http://localhost:3000').origin,
    'Origin rejected.',
    403,
  );
  next();
}
export function signIn(
  store: Store,
  req: Request,
  res: Response,
  user: { id: string; role: Session['role']; email: string },
) {
  const t = randomBytes(32).toString('hex'),
    id = hash(t),
    csrf = randomBytes(24).toString('hex'),
    old = req.session.id;
  store.transaction(() => {
    store.run(
      'INSERT INTO sessions(id,user_id,csrf,expires) VALUES(?,?,?,?)',
      id,
      user.id,
      csrf,
      Date.now() + 7 * 86400000,
    );
    store.run('UPDATE quotes SET session_id=? WHERE session_id=?', id, old);
    store.run('UPDATE missions SET session_id=? WHERE session_id=?', id, old);
    store.run('DELETE FROM sessions WHERE id=?', old);
  });
  res.cookie('rr_session', t, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.SECURE_COOKIES === 'true',
    maxAge: 7 * 86400000,
    path: '/',
  });
  req.session = { id, csrf, userId: user.id, email: user.email, role: user.role };
  return req.session;
}
export function canAccess(store: Store, session: Session, sessionId: string) {
  return (
    session.id === sessionId ||
    !!(
      session.userId &&
      store.one('SELECT id FROM sessions WHERE id=? AND user_id=?', sessionId, session.userId)
    )
  );
}
export function createUser(store: Store, email: string, password: string, role = 'buyer') {
  const id = randomUUID();
  store.run(
    'INSERT INTO users(id,email,password_hash,role) VALUES(?,?,?,?)',
    id,
    email.toLowerCase(),
    passwordHash(password),
    role,
  );
  return { id, email: email.toLowerCase(), role: role as Session['role'] };
}

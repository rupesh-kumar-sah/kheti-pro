import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3001', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const SESSION_SECRET: string =
  process.env.SESSION_SECRET || crypto.randomBytes(48).toString('hex');
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (!IS_PROD) return cb(null, true);
      if (allowedOrigins.length === 0) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: '256kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again later.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this network. Try again later.' },
});

app.use('/api/', apiLimiter);

const failedLoginByPhone = new Map<string, { count: number; lockedUntil: number }>();
const FAILED_LOGIN_THRESHOLD = 5;
const FAILED_LOGIN_LOCK_MS = 15 * 60 * 1000;

function isPhoneLocked(phone: string): number {
  const entry = failedLoginByPhone.get(phone);
  if (!entry) return 0;
  if (entry.lockedUntil > Date.now()) return entry.lockedUntil - Date.now();
  if (entry.lockedUntil !== 0 && entry.lockedUntil <= Date.now()) {
    failedLoginByPhone.delete(phone);
  }
  return 0;
}

function recordFailedLogin(phone: string): void {
  const entry = failedLoginByPhone.get(phone) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= FAILED_LOGIN_THRESHOLD) {
    entry.lockedUntil = Date.now() + FAILED_LOGIN_LOCK_MS;
  }
  failedLoginByPhone.set(phone, entry);
}

function clearFailedLogins(phone: string): void {
  failedLoginByPhone.delete(phone);
}

setInterval(() => {
  const now = Date.now();
  for (const [phone, entry] of failedLoginByPhone) {
    if (entry.lockedUntil && entry.lockedUntil <= now) {
      failedLoginByPhone.delete(phone);
    }
  }
}, 5 * 60 * 1000).unref();

const DEFAULT_PROFILE = {
  name: 'Farmer',
  location: 'Nepal',
  experienceYears: 0,
  crops: [],
  darkMode: false,
  biometricLogin: false,
  preferences: {
    weatherAlerts: true,
    marketPrices: true,
    schemeUpdates: false,
    dailyTips: true,
  },
};

function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!/^\d{10}$/.test(trimmed)) return null;
  return trimmed;
}

function isValidPassword(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  if (raw.length !== 8) return false;
  return /[A-Za-z]/.test(raw) && /\d/.test(raw);
}

function sanitizeText(raw: unknown, maxLen = 100): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}

function signToken(phone: string): string {
  const issuedAt = Date.now();
  const payload = `${Buffer.from(phone).toString('base64url')}.${issuedAt}`;
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token: string | undefined): string | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [phoneB64, issuedAtStr, providedSig] = parts;
  const payload = `${phoneB64}.${issuedAtStr}`;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  let valid = false;
  try {
    const a = Buffer.from(providedSig);
    const b = Buffer.from(expectedSig);
    valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return null;
  }
  if (!valid) return null;
  const issuedAt = parseInt(issuedAtStr, 10);
  if (!Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > TOKEN_TTL_MS) return null;
  try {
    const phone = Buffer.from(phoneB64, 'base64url').toString('utf8');
    if (!/^\d{10}$/.test(phone)) return null;
    return phone;
  } catch {
    return null;
  }
}

function getAuthPhone(req: Request): string | null {
  const header = req.header('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return verifyToken(match[1]);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/signup', signupLimiter, async (req: Request, res: Response) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const password: string = req.body?.password;
    const name = sanitizeText(req.body?.name, 80);
    const location = sanitizeText(req.body?.location, 80);

    if (!phone) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be exactly 8 characters and contain both letters and numbers' });
    }
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = await pool.query('SELECT phone FROM users WHERE phone = $1', [phone]);
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(409).json({ error: 'User already exists with this phone number' });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const profile = {
      ...DEFAULT_PROFILE,
      name,
      location: location || 'Nepal',
    };

    await pool.query(
      'INSERT INTO users (phone, password_hash, profile) VALUES ($1, $2, $3)',
      [phone, hash, profile]
    );

    const token = signToken(phone);
    return res.json({ token, phone, profile });
  } catch (err) {
    console.error('signup error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const password: string = req.body?.password;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password required' });
    }

    const lockMs = isPhoneLocked(phone);
    if (lockMs > 0) {
      const minutes = Math.ceil(lockMs / 60000);
      return res
        .status(429)
        .json({ error: `Account temporarily locked due to failed attempts. Try again in ${minutes} minute(s).` });
    }

    const result = await pool.query(
      'SELECT password_hash, profile FROM users WHERE phone = $1',
      [phone]
    );
    if (!result.rowCount) {
      await bcrypt.compare(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali');
      recordFailedLogin(phone);
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    const row = result.rows[0];
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      recordFailedLogin(phone);
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    clearFailedLogins(phone);
    const token = signToken(phone);
    return res.json({ token, phone, profile: row.profile });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/me', async (req: Request, res: Response) => {
  const phone = getAuthPhone(req);
  if (!phone) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await pool.query(
      'SELECT phone, profile FROM users WHERE phone = $1',
      [phone]
    );
    if (!result.rowCount) return res.status(401).json({ error: 'Unauthorized' });
    return res.json({ phone: result.rows[0].phone, profile: result.rows[0].profile });
  } catch (err) {
    console.error('me error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

function sanitizeProfile(input: any): any | null {
  if (!input || typeof input !== 'object') return null;
  const prefsIn = (input.preferences && typeof input.preferences === 'object') ? input.preferences : {};
  const cropsIn = Array.isArray(input.crops) ? input.crops : [];
  return {
    name: sanitizeText(input.name, 80) || 'Farmer',
    location: sanitizeText(input.location, 80) || 'Nepal',
    experienceYears: Math.max(0, Math.min(120, Number(input.experienceYears) || 0)),
    crops: cropsIn.slice(0, 50).map((c: unknown) => sanitizeText(c, 40)).filter(Boolean),
    darkMode: !!input.darkMode,
    biometricLogin: !!input.biometricLogin,
    biometricId: typeof input.biometricId === 'string' ? sanitizeText(input.biometricId, 128) : undefined,
    preferences: {
      weatherAlerts: !!prefsIn.weatherAlerts,
      marketPrices: !!prefsIn.marketPrices,
      schemeUpdates: !!prefsIn.schemeUpdates,
      dailyTips: !!prefsIn.dailyTips,
    },
  };
}

app.put('/api/me/profile', async (req: Request, res: Response) => {
  const phone = getAuthPhone(req);
  if (!phone) return res.status(401).json({ error: 'Unauthorized' });
  const profile = sanitizeProfile(req.body?.profile);
  if (!profile) {
    return res.status(400).json({ error: 'Profile required' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET profile = $1, updated_at = NOW() WHERE phone = $2 RETURNING profile',
      [profile, phone]
    );
    if (!result.rowCount) return res.status(401).json({ error: 'Unauthorized' });
    return res.json({ profile: result.rows[0].profile });
  } catch (err) {
    console.error('update profile error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

if (IS_PROD) {
  const distDir = path.resolve(__dirname, '..', 'dist');
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on port ${PORT}`);
  if (!process.env.SESSION_SECRET) {
    console.warn(
      '[security] SESSION_SECRET not set in env — generated a random one for this process. Set it in Replit Secrets to keep sessions valid across restarts.'
    );
  }
});

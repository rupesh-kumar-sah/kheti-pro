import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
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

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

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
  if (!/^[0-9+]{6,20}$/.test(trimmed)) return null;
  return trimmed;
}

function makeToken(phone: string): string {
  const random = crypto.randomBytes(24).toString('hex');
  return `${Buffer.from(phone).toString('base64url')}.${random}`;
}

function tokenToPhone(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  try {
    return Buffer.from(parts[0], 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

function getAuthPhone(req: Request): string | null {
  const header = req.header('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return tokenToPhone(match[1]);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const password: string = req.body?.password;
    const name: string = (req.body?.name || '').toString().trim();
    const location: string = (req.body?.location || '').toString().trim();

    if (!phone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = await pool.query('SELECT phone FROM users WHERE phone = $1', [phone]);
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(409).json({ error: 'User already exists with this phone number' });
    }

    const hash = await bcrypt.hash(password, 10);
    const profile = {
      ...DEFAULT_PROFILE,
      name,
      location: location || 'Nepal',
    };

    await pool.query(
      'INSERT INTO users (phone, password_hash, profile) VALUES ($1, $2, $3)',
      [phone, hash, profile]
    );

    const token = makeToken(phone);
    return res.json({ token, phone, profile });
  } catch (err) {
    console.error('signup error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const password: string = req.body?.password;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password required' });
    }

    const result = await pool.query(
      'SELECT password_hash, profile FROM users WHERE phone = $1',
      [phone]
    );
    if (!result.rowCount) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    const row = result.rows[0];
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    const token = makeToken(phone);
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

app.put('/api/me/profile', async (req: Request, res: Response) => {
  const phone = getAuthPhone(req);
  if (!phone) return res.status(401).json({ error: 'Unauthorized' });
  const profile = req.body?.profile;
  if (!profile || typeof profile !== 'object') {
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
});

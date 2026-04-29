import 'dotenv/config';
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
import { createAiRouter } from './aiRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3001', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,           // increased for better concurrency
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Simple In-Memory Profile Cache to avoid DB roundtrips on every page load
const profileCache = new Map<string, { data: any, ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Keep Neon database warm to prevent 5s cold starts
setInterval(async () => {
  try {
    await pool.query('SELECT 1');
  } catch (e) {
    console.warn('[db] Heartbeat failed');
  }
}, 4 * 60 * 1000).unref(); // Every 4 minutes (Neon typically sleeps after 5-10m)

const SESSION_SECRET: string =
  process.env.SESSION_SECRET || crypto.randomBytes(48).toString('hex');
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = IS_PROD ? 12 : 8; // faster in dev

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// --- Advanced "Software Firewall" Middleware ---
const firewall = (req: Request, res: Response, next: NextFunction) => {
  // 1. Block suspicious patterns in URL/Query (SQLi/XSS Detection)
  const suspicious = /<script|select\s+.*\s+from|union\s+select|insert\s+into|delete\s+from|drop\s+table/i;
  const urlToCheck = decodeURIComponent(req.originalUrl);
  
  if (suspicious.test(urlToCheck)) {
    console.warn(`[firewall] Blocked suspicious request from ${req.ip}: ${req.originalUrl}`);
    return res.status(403).json({ error: 'Security violation detected' });
  }

  // 2. Enforce strict request timeout (Slowloris protection)
  res.setTimeout(15000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });

  // 3. Block unusual/suspicious User-Agents
  const ua = req.headers['user-agent'] || '';
  if (ua.includes('sqlmap') || ua.includes('nikto') || ua.includes('dirbuster')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
};

app.use(firewall);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://*"],
        connectSrc: ["'self'", "https://api.groq.com", "https://*.onrender.com"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Monitor performance
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 800) {
      console.warn(`[perf] ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  next();
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin (no origin header) or listed origins
      if (!origin || !IS_PROD || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(compression());
app.use((req, res, next) => {
  if (req.path.startsWith('/api/ai')) return next();
  return express.json({ limit: '5mb' })(req, res, next);
});

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

app.use('/api/ai', createAiRouter());

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
  tasks: [],
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

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'KhetiSmart API' }));

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

// GET /api/me — get current user profile (CACHED)
app.get('/api/me', async (req: Request, res: Response) => {
  const phone = getAuthPhone(req);
  if (!phone) return res.status(401).json({ error: 'Unauthorized' });

  // Check cache
  const cached = profileCache.get(phone);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.json(cached.data);
  }

  try {
    const result = await pool.query('SELECT phone, profile FROM users WHERE phone = $1', [phone]);
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    
    // Update cache
    profileCache.set(phone, { data: result.rows[0], ts: Date.now() });
    
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('get me error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

function sanitizeProfile(input: any): any | null {
  if (!input || typeof input !== 'object') return null;
  const prefsIn = (input.preferences && typeof input.preferences === 'object') ? input.preferences : {};
  const cropsIn = Array.isArray(input.crops) ? input.crops : [];
  const tasksIn = Array.isArray(input.tasks) ? input.tasks : [];
  return {
    name: sanitizeText(input.name, 80) || 'Farmer',
    location: sanitizeText(input.location, 80) || 'Nepal',
    experienceYears: Math.max(0, Math.min(120, Number(input.experienceYears) || 0)),
    crops: cropsIn.slice(0, 50).map((c: unknown) => sanitizeText(c, 40)).filter(Boolean),
    tasks: tasksIn.slice(0, 50).map((t: unknown) => sanitizeText(t, 200)).filter(Boolean),
    darkMode: !!input.darkMode,
    biometricLogin: !!input.biometricLogin,
    biometricId: typeof input.biometricId === 'string' ? sanitizeText(input.biometricId, 128) : undefined,
    profilePicture: typeof input.profilePicture === 'string' && input.profilePicture.startsWith('data:image/') 
      ? input.profilePicture 
      : undefined,
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
      'UPDATE users SET profile = $1, updated_at = NOW() WHERE phone = $2',
      [profile, phone]
    );
    
    // Invalidate cache on update
    profileCache.delete(phone);
    
    if (!result.rowCount) return res.status(401).json({ error: 'Unauthorized' });
    return res.json({ success: true });
  } catch (err) {
    console.error('update profile error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── Storage constants ───────────────────────────────────────────────────────
const POST_MAX_CHARS   = 280;  // max characters per post
const FEED_LIMIT       = 50;   // max posts returned in the community feed
const USER_POST_LIMIT  = 20;   // max published posts per user (oldest auto-purged)
const USER_DRAFT_LIMIT = 5;    // max drafts per user
const POST_TTL_DAYS    = 30;   // auto-delete posts older than this
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/posts — list published posts (newest first, capped at FEED_LIMIT)
app.get('/api/posts', async (req: Request, res: Response) => {
  const phone = getAuthPhone(req);
  if (!phone) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await pool.query(
      `SELECT 
        p.id, 
        p.user_id, 
        COALESCE(u.profile->>'name', p.author_name, 'Farmer') AS author_name, 
        p.content, 
        p.is_draft, 
        p.created_at,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
        EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) AS is_liked
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.phone
       WHERE p.is_draft = false
       ORDER BY likes_count DESC, p.created_at DESC
       LIMIT $2`,
      [phone, FEED_LIMIT]
    );
    return res.json({ posts: result.rows });
  } catch (err) {
    console.error('get posts error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/posts/mine — list current user's posts including drafts
app.get('/api/posts/mine', async (req: Request, res: Response) => {
  const phone = getAuthPhone(req);
  if (!phone) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await pool.query(
      `SELECT 
        p.id, 
        p.user_id, 
        COALESCE(u.profile->>'name', p.author_name, 'Farmer') AS author_name, 
        p.content, 
        p.is_draft, 
        p.created_at,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
        true AS is_liked
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.phone
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2`,
      [phone, USER_POST_LIMIT + USER_DRAFT_LIMIT]
    );
    return res.json({ posts: result.rows });
  } catch (err) {
    console.error('get my posts error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts — create post or draft with auto-eviction of oldest excess posts
app.post('/api/posts', async (req: Request, res: Response) => {
  const phone = getAuthPhone(req);
  if (!phone) return res.status(401).json({ error: 'Unauthorized' });

  const rawContent = req.body?.content;
  if (typeof rawContent !== 'string' || !rawContent.trim()) {
    return res.status(400).json({ error: 'Post content is required' });
  }
  // Hard-trim to POST_MAX_CHARS
  const content = rawContent.trim().slice(0, POST_MAX_CHARS);
  const isDraft = !!req.body?.is_draft;

  try {
    // Check draft cap before inserting draft
    if (isDraft) {
      const draftCount = await pool.query(
        'SELECT COUNT(*) FROM posts WHERE user_id = $1 AND is_draft = true',
        [phone]
      );
      if (parseInt(draftCount.rows[0].count, 10) >= USER_DRAFT_LIMIT) {
        return res.status(429).json({ error: `Draft limit reached (max ${USER_DRAFT_LIMIT}). Delete a draft first.` });
      }
    }

    // Auto-evict oldest published posts beyond USER_POST_LIMIT
    if (!isDraft) {
      await pool.query(
        `DELETE FROM posts
         WHERE id IN (
           SELECT id FROM posts
           WHERE user_id = $1 AND is_draft = false
           ORDER BY created_at ASC
           OFFSET $2
         )`,
        [phone, USER_POST_LIMIT - 1]
      );
    }

    // Get the user's display name from their profile
    const userRow = await pool.query('SELECT profile FROM users WHERE phone = $1', [phone]);
    const authorName: string = userRow.rows[0]?.profile?.name || 'Farmer';

    const result = await pool.query(
      `INSERT INTO posts (user_id, author_name, content, is_draft)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, author_name, content, is_draft, created_at`,
      [phone, authorName, content, isDraft]
    );
    return res.status(201).json({ post: result.rows[0] });
  } catch (err) {
    console.error('create post error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/posts/:id — update own post content or publish a draft
app.put('/api/posts/:id', async (req: Request, res: Response) => {
  const phone = getAuthPhone(req);
  if (!phone) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;

  const rawContent = req.body?.content;
  if (typeof rawContent !== 'string' || !rawContent.trim()) {
    return res.status(400).json({ error: 'Post content is required' });
  }
  const content = rawContent.trim().slice(0, POST_MAX_CHARS);
  const isDraft = req.body?.is_draft !== undefined ? !!req.body.is_draft : undefined;

  try {
    let result;
    if (isDraft !== undefined) {
      // Update both content and draft status
      result = await pool.query(
        `UPDATE posts 
         SET content = $1, is_draft = $2, updated_at = NOW()
         WHERE id = $3 AND user_id = $4
         RETURNING id, user_id, author_name, content, is_draft, created_at`,
        [content, isDraft, id, phone]
      );
    } else {
      // Update content only
      result = await pool.query(
        `UPDATE posts 
         SET content = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING id, user_id, author_name, content, is_draft, created_at`,
        [content, id, phone]
      );
    }

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Post not found or not authorized' });
    }
    return res.json({ post: result.rows[0] });
  } catch (err) {
    console.error('update post error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/posts/:id — delete own post
app.delete('/api/posts/:id', async (req: Request, res: Response) => {
  const phone = getAuthPhone(req);
  if (!phone) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM posts WHERE id = $1 AND user_id = $2', [id, phone]);
    if (!result.rowCount) return res.status(401).json({ error: 'Unauthorized' });
    return res.status(204).send();
  } catch (err) {
    console.error('delete post error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts/:id/like — toggle like
app.post('/api/posts/:id/like', async (req: Request, res: Response) => {
  const phone = getAuthPhone(req);
  if (!phone) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  try {
    // Try to insert a like
    const result = await pool.query(
      `INSERT INTO post_likes (post_id, user_id) 
       VALUES ($1, $2) 
       ON CONFLICT (post_id, user_id) DO NOTHING 
       RETURNING 1`,
      [id, phone]
    );
    
    // If nothing was inserted, it means they already liked it, so we UNLIKE it
    if (result.rowCount === 0) {
      await pool.query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [id, phone]);
      return res.json({ liked: false });
    }
    
    return res.json({ liked: true });
  } catch (err) {
    console.error('like post error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── Auto-purge posts older than POST_TTL_DAYS (runs every hour) ──────────────
setInterval(async () => {
  try {
    const res = await pool.query(
      `DELETE FROM posts WHERE created_at < NOW() - INTERVAL '${POST_TTL_DAYS} days'`
    );
    if (res.rowCount && res.rowCount > 0) {
      console.log(`[cleanup] Purged ${res.rowCount} old post(s) older than ${POST_TTL_DAYS} days`);
    }
  } catch (err) {
    console.error('[cleanup] Auto-purge failed:', err);
  }
}, 60 * 60 * 1000).unref();

// ─────────────────────────────────────────────────────────────────────────────

if (IS_PROD) {
  const distDir = path.resolve(__dirname, '..', 'dist');
  // Cache static assets (JS, CSS, images) for 1 year
  app.use(express.static(distDir, {
    maxAge: '1y',
    immutable: true,
    index: false
  }));
  
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    // Don't cache index.html — always revalidate
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error' });
});

async function initSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      phone TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      profile JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_users_profile_gin ON users USING GIN (profile);
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     TEXT        NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
      author_name TEXT        NOT NULL DEFAULT 'Farmer',
      content     TEXT        NOT NULL CHECK (char_length(content) <= 280),
      is_draft    BOOLEAN     NOT NULL DEFAULT false,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_is_draft   ON posts(is_draft);
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_likes (
      post_id     UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id     TEXT        NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (post_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
  `);
}

let dbReady = false;

// Middleware to wait for DB
app.use((req, res, next) => {
  if (dbReady || req.path === '/api/health') return next();
  return res.status(503).json({ error: 'Server is starting up, please wait...' });
});

// Start listening immediately to avoid ECONNREFUSED from proxy
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Port ${PORT} opened on 0.0.0.0. Initializing database...`);
  
  initSchema()
    .then(() => {
      dbReady = true;
      console.log(`[server] Database initialized. API is fully ready at http://127.0.0.1:${PORT}`);
      if (!process.env.SESSION_SECRET) {
        console.warn('[security] SESSION_SECRET not set in env — using ephemeral secret.');
      }
    })
    .catch((err) => {
      console.error('[server] Failed to initialize database:', err);
      process.exit(1);
    });
});

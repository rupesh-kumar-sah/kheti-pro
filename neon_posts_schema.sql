-- ============================================================
-- Kheti Pro — Neon PostgreSQL Schema
-- Run this in the Neon SQL Editor at: https://console.neon.tech
-- ============================================================

-- ─── 1. USERS TABLE ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  phone        TEXT        PRIMARY KEY,
  password_hash TEXT       NOT NULL,
  profile      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. POSTS TABLE ──────────────────────────────────────────────────────────
-- Storage policy:
--   • max 280 chars per post  (Twitter-style, saves ~85% over 2000-char limit)
--   • max 20 published posts per user (oldest auto-evicted on insert by server)
--   • max  5 drafts per user
--   • posts auto-deleted after 30 days by the server cleanup job
CREATE TABLE IF NOT EXISTS posts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL REFERENCES users(phone) ON DELETE CASCADE,
  author_name TEXT        NOT NULL DEFAULT 'Farmer',
  content     TEXT        NOT NULL CHECK (char_length(content) <= 280),
  is_draft    BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add author_name to existing table (safe to run on existing DBs)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_name TEXT NOT NULL DEFAULT 'Farmer';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_draft   ON posts(is_draft) WHERE is_draft = false;

-- ─── CRUD QUERY EXAMPLES ─────────────────────────────────────────────────────

-- CREATE a new published post
INSERT INTO posts (user_id, content, is_draft)
VALUES ('9800000000', 'My first community post!', false)
RETURNING *;

-- CREATE a draft post
INSERT INTO posts (user_id, content, is_draft)
VALUES ('9800000000', 'Work in progress...', true)
RETURNING *;

-- READ all public posts (newest first)
SELECT id, user_id, content, is_draft, created_at, updated_at
FROM posts
WHERE is_draft = false
ORDER BY created_at DESC
LIMIT 100;

-- READ my posts (including drafts)
SELECT id, user_id, content, is_draft, created_at, updated_at
FROM posts
WHERE user_id = '9800000000'
ORDER BY created_at DESC;

-- READ a single post by ID
SELECT id, user_id, content, is_draft, created_at, updated_at
FROM posts
WHERE id = 'your-uuid-here';

-- UPDATE post content
UPDATE posts
SET    content    = 'Updated post content here',
       updated_at = NOW()
WHERE  id      = 'your-uuid-here'
  AND  user_id = '9800000000'
RETURNING *;

-- PUBLISH a draft (set is_draft = false)
UPDATE posts
SET    is_draft   = false,
       updated_at = NOW()
WHERE  id      = 'your-uuid-here'
  AND  user_id = '9800000000'
RETURNING *;

-- DELETE a post (only owner can delete)
DELETE FROM posts
WHERE  id      = 'your-uuid-here'
  AND  user_id = '9800000000';

-- DELETE all drafts for a user
DELETE FROM posts
WHERE  user_id = '9800000000'
  AND  is_draft = true;

-- ─── UTILITY QUERIES ─────────────────────────────────────────────────────────

-- Count posts per user
SELECT user_id, COUNT(*) AS total_posts, COUNT(*) FILTER (WHERE is_draft) AS drafts
FROM posts
GROUP BY user_id
ORDER BY total_posts DESC;

-- Full-text search posts
SELECT * FROM posts
WHERE to_tsvector('english', content) @@ plainto_tsquery('english', 'tomato farming')
  AND is_draft = false
ORDER BY created_at DESC;

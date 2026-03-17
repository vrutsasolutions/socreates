-- ============================================================
-- IdeaSpark Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,
  profile_image TEXT,
  bio           TEXT,
  is_premium    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- IDEAS
CREATE TABLE IF NOT EXISTS ideas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  image_url   TEXT,
  creator_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  category    VARCHAR(50),
  is_premium  BOOLEAN DEFAULT FALSE,
  like_count  INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- SAVED IDEAS
CREATE TABLE IF NOT EXISTS saved_ideas (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  idea_id  UUID REFERENCES ideas(id) ON DELETE CASCADE,
  saved_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, idea_id)
);

-- MEMBERSHIP
CREATE TABLE IF NOT EXISTS membership (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  plan       VARCHAR(20) NOT NULL,
  status     VARCHAR(20) DEFAULT 'active',
  payment_id TEXT,
  start_date TIMESTAMP DEFAULT NOW(),
  end_date   TIMESTAMP NOT NULL
);

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_ideas_creator    ON ideas(creator_id);
CREATE INDEX IF NOT EXISTS idx_ideas_category   ON ideas(category);
CREATE INDEX IF NOT EXISTS idx_ideas_premium    ON ideas(is_premium);
CREATE INDEX IF NOT EXISTS idx_ideas_likes      ON ideas(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_saved_user       ON saved_ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_user  ON membership(user_id);

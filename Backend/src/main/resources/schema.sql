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
  plan       VARCHAR(20) NOT NULL,   -- "reader" | "creator"
  billing    VARCHAR(20),            -- "monthly" | "yearly"
  gateway    VARCHAR(20),            -- "razorpay" (only supported gateway)
  plan_label VARCHAR(255),           -- display, e.g. "Creators Pro"
  price      VARCHAR(20),            -- display, e.g. "₹999"
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

-- ============================================================
-- MIGRATIONS
-- ============================================================
-- The `messages` table is created by Hibernate (ddl-auto=update). Hibernate 6
-- auto-generates a CHECK constraint for the EnumType.STRING `type` column from
-- whatever enum values exist when the column is first created, and never
-- updates it afterward. When a new MessageType is added (e.g. IDEA for shared
-- ideas, after FILE), existing databases keep the stale constraint and reject
-- the new value. Re-run this whenever MessageType gains a value.
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check
  CHECK (type IN ('TEXT', 'IMAGE', 'VOICE', 'FILE', 'IDEA'));

-- Membership gained billing/gateway/plan_label/price columns when the Razorpay
-- checkout flow shipped. Hibernate (ddl-auto=update) adds these automatically,
-- but run these for any DB managed outside Hibernate.
ALTER TABLE membership ADD COLUMN IF NOT EXISTS billing    VARCHAR(20);
ALTER TABLE membership ADD COLUMN IF NOT EXISTS gateway    VARCHAR(20);
ALTER TABLE membership ADD COLUMN IF NOT EXISTS plan_label VARCHAR(255);
ALTER TABLE membership ADD COLUMN IF NOT EXISTS price      VARCHAR(20);


-- BANNED EMAILS — admin moderation (ban + delete a user for a policy
-- violation, e.g. uploading restricted content) permanently blocks that
-- email from registering again. Deliberately NOT a foreign key to users(id):
-- the row must outlive the user row it was created from. See
-- BannedEmail.java / UserAccountService.deleteAndBan / AdminUserController.
CREATE TABLE IF NOT EXISTS banned_emails (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR(150) UNIQUE NOT NULL,
  reason     TEXT,
  banned_by  VARCHAR(150),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banned_emails_email ON banned_emails(email);

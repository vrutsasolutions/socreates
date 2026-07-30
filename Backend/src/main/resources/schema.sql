-- ============================================================
-- IdeaSpark / SoCreate — Complete Database Schema
-- Run this in Supabase SQL Editor on a fresh project, OR use it
-- as the reference migration for an existing database.
--
-- Hibernate is set to ddl-auto=validate — it checks that every
-- @Entity's columns exist but NEVER creates or alters tables.
-- This file is the canonical source of truth for the schema.
-- ============================================================

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    VARCHAR(100) NOT NULL,
  email                   VARCHAR(150) UNIQUE NOT NULL,
  username                VARCHAR(30) UNIQUE,
  password                VARCHAR(255) NOT NULL,
  profile_image           TEXT,
  bio                     TEXT,
  is_premium              BOOLEAN DEFAULT FALSE,
  is_verified             BOOLEAN DEFAULT FALSE,
  is_creator_pro          BOOLEAN DEFAULT FALSE,
  is_premium_publishing   BOOLEAN DEFAULT FALSE,
  active_payout_account_id UUID,  -- FK added after creator_payout_accounts exists
  notify_new_ideas        BOOLEAN NOT NULL DEFAULT TRUE,
  notify_likes            BOOLEAN NOT NULL DEFAULT TRUE,
  notify_comments         BOOLEAN NOT NULL DEFAULT TRUE,
  show_activity_status    BOOLEAN NOT NULL DEFAULT TRUE,
  is_public_profile       BOOLEAN NOT NULL DEFAULT TRUE,
  is_online               BOOLEAN DEFAULT FALSE,
  last_seen               TIMESTAMP,
  auth_provider           VARCHAR(50) DEFAULT 'local',
  created_at              TIMESTAMP DEFAULT NOW()
);

-- ── IDEAS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ideas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  image_url   TEXT,
  creator_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  category    VARCHAR(50),
  is_premium  BOOLEAN DEFAULT FALSE,
  like_count  INT DEFAULT 0,
  read_count  INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Hibernate @ElementCollection for multi-image ideas
CREATE TABLE IF NOT EXISTS idea_images (
  idea_id   UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL
);

-- ── IDEA LIKES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idea_likes (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  idea_id  UUID REFERENCES ideas(id) ON DELETE CASCADE,
  UNIQUE(user_id, idea_id)
);

-- ── IDEA READS (premium free-read tracking) ──────────────────
CREATE TABLE IF NOT EXISTS idea_reads (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id  UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  read_at  TIMESTAMP,
  UNIQUE(user_id, idea_id)
);

-- ── SAVED IDEAS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_ideas (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  idea_id  UUID REFERENCES ideas(id) ON DELETE CASCADE,
  saved_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, idea_id)
);

-- ── COMMENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content    VARCHAR(1000) NOT NULL,
  idea_id    UUID REFERENCES ideas(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── FOLLOWS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- ── FOLLOW REQUESTS (private accounts) ───────────────────────
CREATE TABLE IF NOT EXISTS follow_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at    TIMESTAMP,
  responded_at  TIMESTAMP,
  UNIQUE(requester_id, target_id)
);

-- ── BLOCKED USERS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL,
  UNIQUE(blocker_id, blocked_id)
);

-- ── CONVERSATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant2_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  initiated_by     UUID REFERENCES users(id),
  status           VARCHAR(20) DEFAULT 'ACCEPTED',
  created_at       TIMESTAMP DEFAULT NOW(),
  UNIQUE(participant1_id, participant2_id)
);

-- ── MESSAGES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(20) NOT NULL,
  content         TEXT,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Hibernate @ElementCollection for reactions and delete-for-me
CREATE TABLE IF NOT EXISTS message_reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  emoji      VARCHAR(16),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS message_deleted_for (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  PRIMARY KEY (message_id, user_id)
);

-- ── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  message         TEXT NOT NULL,
  read_status     BOOLEAN DEFAULT FALSE,
  reference_id    UUID,
  type            VARCHAR(20) DEFAULT 'SYSTEM',
  conversation_id UUID,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ── MEMBERSHIP ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS membership (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                      VARCHAR(20) NOT NULL,
  billing                   VARCHAR(20),
  gateway                   VARCHAR(20),
  plan_label                VARCHAR(255),
  price                     VARCHAR(20),
  status                    VARCHAR(20) DEFAULT 'active',
  payment_id                TEXT,
  start_date                TIMESTAMP DEFAULT NOW(),
  end_date                  TIMESTAMP NOT NULL,
  razorpay_subscription_id  TEXT,
  razorpay_plan_id          TEXT,
  next_billing_date         TIMESTAMP,
  cancelled_at              TIMESTAMP,
  webhook_status            TEXT,
  updated_at                TIMESTAMP
);

-- ── MEMBERSHIP PAYMENTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS membership_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type           TEXT NOT NULL,
  amount              INT NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'INR',
  payment_gateway     TEXT NOT NULL DEFAULT 'razorpay',
  gateway_payment_id  TEXT UNIQUE,
  gateway_order_id    TEXT UNIQUE,
  status              TEXT NOT NULL,
  paid_at             TIMESTAMP,
  created_at          TIMESTAMP DEFAULT NOW(),
  raw_payload         JSONB,
  signature_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  webhook_received    BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── PLANS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id               SERIAL PRIMARY KEY,
  plan_code        TEXT NOT NULL UNIQUE,
  plan_name        TEXT NOT NULL,
  billing_cycle    TEXT NOT NULL,
  price_paise      INT NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'INR',
  razorpay_plan_id TEXT UNIQUE,
  is_active        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

-- ── REVENUE POOLS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_pools (
  id                        SERIAL PRIMARY KEY,
  month                     DATE NOT NULL UNIQUE,
  total_revenue_paise       BIGINT,
  reader_revenue_paise      BIGINT,
  creator_pro_revenue_paise BIGINT,
  socreate_share_paise      BIGINT,
  creator_pool_paise        BIGINT,
  status                    TEXT NOT NULL DEFAULT 'open',
  locked_at                 TIMESTAMP,
  distributed_at            TIMESTAMP,
  created_at                TIMESTAMP DEFAULT NOW()
);

-- ── CREATOR MONTHLY METRICS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_monthly_metrics (
  id            SERIAL PRIMARY KEY,
  creator_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month         DATE NOT NULL,
  views         BIGINT NOT NULL DEFAULT 0,
  saves         BIGINT NOT NULL DEFAULT 0,
  comments      BIGINT NOT NULL DEFAULT 0,
  likes         BIGINT NOT NULL DEFAULT 0,
  raw_score     NUMERIC(12,2),
  share_percent NUMERIC(7,4),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(creator_id, month)
);

-- ── CREATOR PAYOUT ACCOUNTS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_payout_accounts (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  legal_name                  TEXT,
  pan_number                  VARCHAR(255),  -- AES-256-GCM encrypted
  mobile_number               TEXT,
  bank_name                   TEXT,
  payout_account_name         TEXT,
  payout_account_number_last4 TEXT,
  payout_ifsc                 TEXT,
  payout_method               TEXT,
  razorpay_contact_id         TEXT,
  razorpay_fund_account_id    TEXT,
  is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Now add the FK from users → creator_payout_accounts
ALTER TABLE users
  ADD CONSTRAINT fk_users_active_payout_account
  FOREIGN KEY (active_payout_account_id)
  REFERENCES creator_payout_accounts(id)
  ON DELETE SET NULL;

-- ── CREATOR EARNINGS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_earnings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month               DATE NOT NULL,
  pool_id             INT REFERENCES revenue_pools(id),
  score_percent       NUMERIC(5,2),
  revenue_paise       BIGINT,
  status              TEXT NOT NULL DEFAULT 'Estimating',
  razorpay_payout_id  TEXT,
  paid_at             TIMESTAMP,
  scheduled_for       TIMESTAMP,
  rolled_from         DATE,
  failure_reason      TEXT,
  retry_count         INT DEFAULT 0,
  next_retry_at       TIMESTAMP,
  payout_account_id   UUID REFERENCES creator_payout_accounts(id),
  created_at          TIMESTAMP DEFAULT NOW(),
  UNIQUE(creator_id, month)
);

-- ── EMAIL OTPs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_otps (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(150) NOT NULL,
  otp_code       VARCHAR(10) NOT NULL,
  otp_expires_at TIMESTAMP NOT NULL,
  purpose        VARCHAR(50) NOT NULL,
  verified       BOOLEAN NOT NULL DEFAULT FALSE,
  attempts       INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMP DEFAULT NOW()
);

-- ── DEVICE TOKENS (FCM push notifications) ───────────────────
CREATE TABLE IF NOT EXISTS device_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform     VARCHAR(20) NOT NULL DEFAULT 'android',
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

-- ── FEEDBACK ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  rating     INT NOT NULL,
  review     TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ── REPORTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason           TEXT NOT NULL,
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'PENDING',
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ── BANNED EMAILS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banned_emails (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR(150) UNIQUE NOT NULL,
  reason     TEXT,
  banned_by  VARCHAR(150),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── AUDIT LOG ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  metadata    TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ideas_creator       ON ideas(creator_id);
CREATE INDEX IF NOT EXISTS idx_ideas_category      ON ideas(category);
CREATE INDEX IF NOT EXISTS idx_ideas_premium       ON ideas(is_premium);
CREATE INDEX IF NOT EXISTS idx_ideas_likes         ON ideas(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_saved_user          ON saved_ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_user     ON membership(user_id);
CREATE INDEX IF NOT EXISTS idx_banned_emails_email ON banned_emails(email);
CREATE INDEX IF NOT EXISTS idx_notifications_user  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv       ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user  ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_order            ON membership_payments(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_mp_payment          ON membership_payments(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_earnings_creator    ON creator_earnings(creator_id);
CREATE INDEX IF NOT EXISTS idx_earnings_status     ON creator_earnings(status);


-- ============================================================
-- CONSTRAINT MIGRATIONS (safe to re-run)
-- ============================================================
-- Keep the messages type CHECK in sync with MessageType enum values.
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check
  CHECK (type IN ('TEXT', 'IMAGE', 'VOICE', 'FILE', 'IDEA', 'PROFILE'));


-- ============================================================
-- SEED DATA — plans (required for checkout to work)
-- ============================================================
INSERT INTO plans (plan_code, plan_name, billing_cycle, price_paise, currency, razorpay_plan_id, is_active)
VALUES
  ('reader_monthly',  'Reader Premium Monthly',  'monthly',  9900,  'INR', NULL, TRUE),
  ('reader_yearly',   'Reader Premium Yearly',   'yearly',  79900,  'INR', NULL, TRUE),
  ('creator_monthly', 'Creator Pro Monthly',     'monthly', 19900,  'INR', NULL, TRUE),
  ('creator_yearly',  'Creator Pro Yearly',      'yearly',  99900,  'INR', NULL, TRUE)
ON CONFLICT (plan_code) DO NOTHING;
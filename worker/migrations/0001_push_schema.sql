-- Armazena apenas dados técnicos de Web Push e instantes UTC.
-- Não incluir nomes de medicamentos, doses, diagnósticos ou outros dados clínicos.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER
);

CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  fire_at_ms INTEGER NOT NULL,
  created_at_ms INTEGER NOT NULL,
  sent_at_ms INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scheduled_due
  ON scheduled_notifications(sent_at_ms, fire_at_ms);

CREATE INDEX IF NOT EXISTS idx_scheduled_subscription
  ON scheduled_notifications(subscription_id, fire_at_ms);

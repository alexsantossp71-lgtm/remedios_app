-- Contadores técnicos de rate limit compartilhados entre isolates do Worker.
-- subject_hash guarda SHA-256 do IP; endereços IP em texto puro não são persistidos.
CREATE TABLE IF NOT EXISTS api_rate_limits (
  scope TEXT NOT NULL,
  subject_hash TEXT NOT NULL,
  window_start_ms INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at_ms INTEGER NOT NULL,
  PRIMARY KEY (scope, subject_hash, window_start_ms)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_expiry
  ON api_rate_limits(expires_at_ms);

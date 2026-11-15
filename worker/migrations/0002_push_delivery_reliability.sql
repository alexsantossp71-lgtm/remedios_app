-- Controla concorrência, timeout e retentativas do envio Push.
-- Apenas metadados técnicos; não adicionar dados clínicos nesta tabela.
ALTER TABLE scheduled_notifications ADD COLUMN claim_token TEXT;
ALTER TABLE scheduled_notifications ADD COLUMN claimed_until_ms INTEGER;
ALTER TABLE scheduled_notifications ADD COLUMN next_attempt_at_ms INTEGER;
ALTER TABLE scheduled_notifications ADD COLUMN failed_at_ms INTEGER;
ALTER TABLE scheduled_notifications ADD COLUMN last_status INTEGER;

CREATE INDEX IF NOT EXISTS idx_scheduled_retry
  ON scheduled_notifications(sent_at_ms, failed_at_ms, next_attempt_at_ms, claimed_until_ms, fire_at_ms);

-- Índices para limpeza limitada de eventos técnicos antigos.
CREATE INDEX IF NOT EXISTS idx_scheduled_sent_retention
  ON scheduled_notifications(sent_at_ms);

CREATE INDEX IF NOT EXISTS idx_scheduled_failed_retention
  ON scheduled_notifications(failed_at_ms);

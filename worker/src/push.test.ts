import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1DatabaseLike } from './push';

vi.mock('@block65/webcrypto-web-push', () => ({
  buildPushPayload: vi.fn(async () => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: new Uint8Array([1, 2, 3]),
  })),
}));

interface TestNotification {
  id: string;
  subscription_id: string;
  fire_at_ms: number;
  attempts: number;
  sent_at_ms: number | null;
  failed_at_ms: number | null;
  next_attempt_at_ms: number | null;
  claim_token: string | null;
  claimed_until_ms: number | null;
  last_status: number | null;
}

interface TestSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

class FakeStatement {
  private values: unknown[] = [];

  constructor(private readonly db: FakeD1, private readonly sql: string) {}

  bind(...values: unknown[]): FakeStatement {
    this.values = values;
    return this;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    if (this.sql.includes('RETURNING id')) {
      const [claimToken, claimedUntil, maxAttempts, now, retryNow, leaseNow] = this.values as [string, number, number, number, number, number];
      const eligible = this.db.notifications
        .filter((item) =>
          item.sent_at_ms === null &&
          item.failed_at_ms === null &&
          item.attempts < maxAttempts &&
          item.fire_at_ms <= now &&
          (item.next_attempt_at_ms === null || item.next_attempt_at_ms <= retryNow) &&
          (item.claimed_until_ms === null || item.claimed_until_ms <= leaseNow)
        )
        .sort((a, b) => a.fire_at_ms - b.fire_at_ms)
        .slice(0, 5);
      eligible.forEach((item) => {
        item.claim_token = claimToken;
        item.claimed_until_ms = claimedUntil;
      });
      return { results: eligible.map((item) => ({ id: item.id }) as T) };
    }

    if (this.sql.includes('SELECT n.id AS notification_id')) {
      const [claimToken, claimedUntil] = this.values as [string, number];
      const results = this.db.notifications
        .filter((item) => item.claim_token === claimToken && item.claimed_until_ms === claimedUntil)
        .flatMap((item) => {
          const subscription = this.db.subscriptions.find((candidate) => candidate.id === item.subscription_id);
          return subscription ? [{
            notification_id: item.id,
            subscription_id: item.subscription_id,
            attempts: item.attempts,
            endpoint: subscription.endpoint,
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          }] : [];
        });
      return { results: results as T[] };
    }

    throw new Error(`Consulta all() inesperada: ${this.sql}`);
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    return null;
  }

  async run(): Promise<{ success: boolean }> {
    if (this.sql.includes('SET sent_at_ms')) {
      const [sentAt, status, id, token] = this.values as [number, number, string, string];
      const item = this.db.notifications.find((candidate) => candidate.id === id && candidate.claim_token === token);
      if (item) {
        item.sent_at_ms = sentAt;
        item.attempts += 1;
        item.last_status = status;
        item.next_attempt_at_ms = null;
        item.claim_token = null;
        item.claimed_until_ms = null;
      }
      return { success: true };
    }

    if (this.sql.includes('SET attempts = ?')) {
      const [attempts, nextAttempt, failedAt, status, id, token] = this.values as [number, number | null, number | null, number | null, string, string];
      const item = this.db.notifications.find((candidate) => candidate.id === id && candidate.claim_token === token);
      if (item) {
        item.attempts = attempts;
        item.next_attempt_at_ms = nextAttempt;
        item.failed_at_ms = failedAt;
        item.last_status = status;
        item.claim_token = null;
        item.claimed_until_ms = null;
      }
      return { success: true };
    }

    if (this.sql.includes('DELETE FROM push_subscriptions')) {
      const [subscriptionId] = this.values as [string];
      this.db.subscriptions = this.db.subscriptions.filter((item) => item.id !== subscriptionId);
      this.db.notifications = this.db.notifications.filter((item) => item.subscription_id !== subscriptionId);
      return { success: true };
    }

    throw new Error(`Consulta run() inesperada: ${this.sql}`);
  }
}

class FakeD1 {
  notifications: TestNotification[] = [];
  subscriptions: TestSubscription[] = [];

  prepare(sql: string): FakeStatement {
    return new FakeStatement(this, sql);
  }

  async batch<T = unknown>(statements: unknown[]): Promise<Array<{ results?: T[] }>> {
    void statements;
    return [];
  }
}

const makeDatabase = (attempts = 0): FakeD1 => {
  const db = new FakeD1();
  db.subscriptions.push({
    id: 'subscription-1',
    endpoint: 'https://push.example.test/subscription',
    p256dh: 'public-key',
    auth: 'auth-secret',
  });
  db.notifications.push({
    id: 'notification-1',
    subscription_id: 'subscription-1',
    fire_at_ms: Date.now() - 1_000,
    attempts,
    sent_at_ms: null,
    failed_at_ms: null,
    next_attempt_at_ms: null,
    claim_token: null,
    claimed_until_ms: null,
    last_status: null,
  });
  return db;
};

const makeEnv = (db: FakeD1) => ({
  PUSH_DB: db as unknown as D1DatabaseLike,
  VAPID_PUBLIC_KEY: 'public-vapid-key',
  VAPID_PRIVATE_KEY: 'private-vapid-key',
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-15T12:00:00.000Z'));
  fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('entrega de notificações Push no Worker', () => {
  it('não consulta o banco quando as chaves VAPID não estão configuradas', async () => {
    const db = makeDatabase();
    const { sendDuePushes } = await import('./push');

    await sendDuePushes({ PUSH_DB: db as unknown as D1DatabaseLike });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.notifications[0].claim_token).toBeNull();
  });

  it('marca o evento como enviado e libera a reserva após resposta 2xx', async () => {
    const db = makeDatabase();
    const { sendDuePushes } = await import('./push');

    await sendDuePushes(makeEnv(db));

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(db.notifications[0].sent_at_ms).toBe(Date.now());
    expect(db.notifications[0].attempts).toBe(1);
    expect(db.notifications[0].last_status).toBe(201);
    expect(db.notifications[0].claim_token).toBeNull();
    expect(db.notifications[0].claimed_until_ms).toBeNull();
  });

  it('reserva o evento atomicamente para impedir envio duplicado por Cron concorrente', async () => {
    const db = makeDatabase();
    const { sendDuePushes } = await import('./push');

    await Promise.all([sendDuePushes(makeEnv(db)), sendDuePushes(makeEnv(db))]);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(db.notifications[0].sent_at_ms).not.toBeNull();
  });

  it('agenda nova tentativa com backoff após falha temporária', async () => {
    const db = makeDatabase();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    const { sendDuePushes } = await import('./push');

    await sendDuePushes(makeEnv(db));

    expect(db.notifications[0].attempts).toBe(1);
    expect(db.notifications[0].next_attempt_at_ms).toBe(Date.now() + 60_000);
    expect(db.notifications[0].failed_at_ms).toBeNull();
    expect(db.notifications[0].claim_token).toBeNull();

    await sendDuePushes(makeEnv(db));
    expect(fetchMock).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(60_000);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await sendDuePushes(makeEnv(db));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(db.notifications[0].attempts).toBe(2);
    expect(db.notifications[0].next_attempt_at_ms).toBe(Date.now() + 5 * 60_000);
  });

  it('encerra após cinco falhas sem marcar falsamente o evento como enviado', async () => {
    const db = makeDatabase(4);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    const { sendDuePushes } = await import('./push');

    await sendDuePushes(makeEnv(db));

    expect(db.notifications[0].attempts).toBe(5);
    expect(db.notifications[0].failed_at_ms).toBe(Date.now());
    expect(db.notifications[0].sent_at_ms).toBeNull();
    expect(db.notifications[0].next_attempt_at_ms).toBeNull();

    await sendDuePushes(makeEnv(db));
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('remove inscrição expirada quando o provedor responde 404 ou 410', async () => {
    const db = makeDatabase();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 410 }));
    const { sendDuePushes } = await import('./push');

    await sendDuePushes(makeEnv(db));

    expect(db.subscriptions).toHaveLength(0);
    expect(db.notifications).toHaveLength(0);
  });

  it('aplica timeout à chamada do provedor e registra retentativa sem dados sensíveis', async () => {
    const db = makeDatabase();
    fetchMock.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
    const { sendDuePushes } = await import('./push');

    await sendDuePushes(makeEnv(db));

    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
      signal: expect.any(AbortSignal),
    }));
    expect(db.notifications[0].attempts).toBe(1);
    expect(db.notifications[0].last_status).toBeNull();
    expect(db.notifications[0].next_attempt_at_ms).toBe(Date.now() + 60_000);
  });
});

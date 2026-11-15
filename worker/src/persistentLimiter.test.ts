import { describe, expect, it } from 'vitest';
import type { D1DatabaseLike } from './push';
import { checkPersistentRateLimits, cleanupExpiredRateLimits } from './limiter';

class FakeRateLimitStatement {
  private values: unknown[] = [];

  constructor(private readonly db: FakeRateLimitDatabase, private readonly sql: string) {}

  bind(...values: unknown[]): FakeRateLimitStatement {
    this.values = values;
    return this;
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    if (!this.sql.includes('RETURNING count')) throw new Error(`Consulta first() inesperada: ${this.sql}`);
    const [scope, subjectHash, windowStart, expiresAt] = this.values as [string, string, number, number];
    const key = `${scope}:${subjectHash}:${windowStart}`;
    const next = (this.db.counters.get(key)?.count ?? 0) + 1;
    this.db.counters.set(key, { count: next, expiresAt });
    return { count: next } as T;
  }

  async run(): Promise<{ success: boolean }> {
    if (!this.sql.includes('DELETE FROM api_rate_limits')) throw new Error(`Consulta run() inesperada: ${this.sql}`);
    const [now] = this.values as [number];
    for (const [key, value] of this.db.counters) {
      if (value.expiresAt <= now) this.db.counters.delete(key);
    }
    return { success: true };
  }
}

class FakeRateLimitDatabase {
  counters = new Map<string, { count: number; expiresAt: number }>();

  prepare(sql: string): FakeRateLimitStatement {
    return new FakeRateLimitStatement(this, sql);
  }
}

const config = { windowMs: 300_000, windowMax: 2, dayMax: 10 };
const asD1 = (db: FakeRateLimitDatabase) => db as unknown as D1DatabaseLike;

describe('rate limit persistente compartilhado por D1', () => {
  it('compartilha a janela entre instâncias simuladas do Worker', async () => {
    const db = new FakeRateLimitDatabase();
    const now = Date.UTC(2026, 10, 15, 12, 0, 0);

    expect((await checkPersistentRateLimits(asD1(db), '203.0.113.10', now, config)).allowed).toBe(true);
    // Segunda instância usa o mesmo banco, como isolates distintos em produção.
    expect((await checkPersistentRateLimits(asD1(db), '203.0.113.10', now + 1, config)).allowed).toBe(true);
    const blocked = await checkPersistentRateLimits(asD1(db), '203.0.113.10', now + 2, config);

    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe('minute');
  });

  it('aplica limite diário por IP mesmo depois da janela curta expirar', async () => {
    const db = new FakeRateLimitDatabase();
    const now = Date.UTC(2026, 10, 15, 12, 0, 0);
    const dailyConfig = { windowMs: 1_000, windowMax: 10, dayMax: 2 };

    expect((await checkPersistentRateLimits(asD1(db), '203.0.113.11', now, dailyConfig)).allowed).toBe(true);
    expect((await checkPersistentRateLimits(asD1(db), '203.0.113.11', now + 2_000, dailyConfig)).allowed).toBe(true);
    const blocked = await checkPersistentRateLimits(asD1(db), '203.0.113.11', now + 4_000, dailyConfig);

    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe('ip-day');
  });

  it('separa o escopo de diagnóstico do limite normal', async () => {
    const db = new FakeRateLimitDatabase();
    const now = Date.UTC(2026, 10, 15, 12, 0, 0);

    const regular = await checkPersistentRateLimits(asD1(db), '203.0.113.12', now, config, 'default');
    const diagnostic = await checkPersistentRateLimits(asD1(db), '203.0.113.12', now, {
      windowMs: 300_000,
      windowMax: 250,
      dayMax: 1_000,
    }, 'diagnostics');

    expect(regular.allowed).toBe(true);
    expect(diagnostic.allowed).toBe(true);
    expect([...db.counters.keys()].some((key) => key.startsWith('default:window:'))).toBe(true);
    expect([...db.counters.keys()].some((key) => key.startsWith('diagnostics:window:'))).toBe(true);
  });

  it('aplica teto agregado diário entre endereços IP distintos', async () => {
    const db = new FakeRateLimitDatabase();
    const now = Date.UTC(2026, 10, 15, 12, 0, 0);
    const globalConfig = { windowMs: 300_000, windowMax: 10, dayMax: 1 };

    for (let index = 1; index <= 4; index += 1) {
      const result = await checkPersistentRateLimits(asD1(db), `203.0.113.${index}`, now, globalConfig);
      expect(result.allowed).toBe(true);
    }
    const blocked = await checkPersistentRateLimits(asD1(db), '203.0.113.99', now, globalConfig);

    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe('global-day');
  });

  it('persiste apenas hash do IP, nunca o endereço em texto puro', async () => {
    const db = new FakeRateLimitDatabase();
    await checkPersistentRateLimits(asD1(db), '198.51.100.25', Date.UTC(2026, 10, 15), config);

    expect([...db.counters.keys()].some((key) => key.includes('198.51.100.25'))).toBe(false);
  });

  it('remove contadores expirados sem tocar nos ainda válidos', async () => {
    const db = new FakeRateLimitDatabase();
    db.counters.set('old', { count: 5, expiresAt: 100 });
    db.counters.set('current', { count: 2, expiresAt: 300 });

    await cleanupExpiredRateLimits(asD1(db), 200);

    expect(db.counters.has('old')).toBe(false);
    expect(db.counters.has('current')).toBe(true);
  });
});

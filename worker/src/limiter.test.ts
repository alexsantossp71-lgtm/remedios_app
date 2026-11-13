
import { describe, it, expect } from 'vitest';
import { clientIp, DailyCounter, RateLimits, SlidingWindowLimiter } from './limiter';

describe('SlidingWindowLimiter', () => {
    it('permite até maxEvents na janela e bloqueia o seguinte', () => {
        const limiter = new SlidingWindowLimiter(3, 60_000);
        expect(limiter.check('ip1', 1_000).allowed).toBe(true);
        expect(limiter.check('ip1', 2_000).allowed).toBe(true);
        expect(limiter.check('ip1', 3_000).allowed).toBe(true);
        const blocked = limiter.check('ip1', 4_000);
        expect(blocked.allowed).toBe(false);
        expect(blocked.reason).toBe('minute');
        expect(blocked.retryAfterSec).toBeGreaterThan(0);
    });

    it('libera novamente após passar a janela', () => {
        const limiter = new SlidingWindowLimiter(1, 60_000);
        expect(limiter.check('ip1', 1_000).allowed).toBe(true);
        expect(limiter.check('ip1', 2_000).allowed).toBe(false);
        expect(limiter.check('ip1', 61_500).allowed).toBe(true);
    });

    it('chaves diferentes têm contagens independentes', () => {
        const limiter = new SlidingWindowLimiter(1, 60_000);
        expect(limiter.check('ip1', 1_000).allowed).toBe(true);
        expect(limiter.check('ip2', 1_100).allowed).toBe(true);
    });
});

describe('DailyCounter', () => {
    it('respeita o teto diário', () => {
        const counter = new DailyCounter(2);
        const t1 = Date.UTC(2026, 0, 15, 10, 0, 0);
        expect(counter.check('ip1', t1).allowed).toBe(true);
        expect(counter.check('ip1', t1 + 1_000).allowed).toBe(true);
        const blocked = counter.check('ip1', t1 + 2_000);
        expect(blocked.allowed).toBe(false);
        expect(blocked.retryAfterSec).toBeGreaterThan(0);
    });

    it('zera na virada do dia UTC', () => {
        const counter = new DailyCounter(1);
        const t1 = Date.UTC(2026, 0, 15, 23, 59, 0);
        expect(counter.check('ip1', t1).allowed).toBe(true);
        expect(counter.check('ip1', t1 + 30_000).allowed).toBe(false);
        expect(counter.check('ip1', t1 + 120_000).allowed).toBe(true); // já é outro dia
    });
});

describe('RateLimits', () => {
    const cfg = { windowMs: 60_000, windowMax: 5, dayMax: 10 };
    const base = Date.UTC(2026, 0, 15, 12, 0, 0);

    it('bloqueia por janela curta antes do teto diário', () => {
        const limits = new RateLimits(cfg);
        for (let i = 0; i < 5; i++) expect(limits.hit('ip1', base + i).allowed).toBe(true);
        const verdict = limits.hit('ip1', base + 10);
        expect(verdict.allowed).toBe(false);
        expect(verdict.reason).toBe('minute');
    });

    it('bloqueia por teto diário quando a janela curta ainda permite', () => {
        const limits = new RateLimits(cfg);
        // Espalha os pedidos (65s > janela de 60s) para nunca estourar a janela.
        for (let i = 0; i < 10; i++) expect(limits.hit('ip1', base + i * 65_000).allowed).toBe(true);
        const verdict = limits.hit('ip1', base + 700_000);
        expect(verdict.allowed).toBe(false);
        expect(verdict.reason).toBe('ip-day');
    });

    it('teto global diário fecha o registro para todos', () => {
        const limits = new RateLimits({ windowMs: 60_000, windowMax: 100, dayMax: 2 });
        expect(limits.hit('ip1', base).allowed).toBe(true);
        expect(limits.hit('ip1', base + 1).allowed).toBe(true); // ipDay cheio (2/2)
        expect(limits.hit('ip1', base + 2).allowed).toBe(false);
        expect(limits.hit('ip2', base + 3).allowed).toBe(true);
        // Teto global = dayMax * 4 = 8; já há 3 pedidos, então ip3..ip7 passam.
        for (let i = 0; i < 5; i++) expect(limits.hit(`ip${i + 3}`, base + 4 + i).allowed).toBe(true);
        const verdict = limits.hit('ip9', base + 10);
        expect(verdict.allowed).toBe(false);
        expect(verdict.reason).toBe('global-day');
    });
});

describe('clientIp', () => {
    const requestWith = (headers: Record<string, string>): Request =>
        new Request('https://proxy.exemplo.com/v1/chat/completions', { headers });

    it('usa CF-Connecting-IP quando presente', () => {
        expect(clientIp(requestWith({ 'CF-Connecting-IP': '203.0.113.9' }))).toBe('203.0.113.9');
    });

    it('não confia em X-Forwarded-For enviado pelo cliente', () => {
        expect(clientIp(requestWith({ 'X-Forwarded-For': '198.51.100.7, 10.0.0.1' }))).toBe('unknown');
        expect(clientIp(requestWith({}))).toBe('unknown');
    });
});

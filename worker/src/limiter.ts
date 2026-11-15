
// Primitivas em memória mantidas para testes unitários legados. As rotas de
// produção usam checkPersistentRateLimits(), com contadores atômicos no D1
// compartilhados entre isolates; ver a migração 0003_persistent_rate_limits.sql.

export interface RateVerdict {
    allowed: boolean;
    /** Segundos que o cliente deve esperar (Retry-After). */
    retryAfterSec: number;
    /** Qual limite bloqueou ('' quando permitido). */
    reason: '' | 'minute' | 'ip-day' | 'global-day';
}

/** Janela deslizante por chave (IP do cliente). */
export class SlidingWindowLimiter {
    private readonly events = new Map<string, number[]>();

    constructor(
        private readonly maxEvents: number,
        private readonly windowMs: number
    ) {}

    check(key: string, now: number): RateVerdict {
        const cutoff = now - this.windowMs;
        const recent = (this.events.get(key) ?? []).filter((t) => t > cutoff);
        if (recent.length >= this.maxEvents) {
            const oldest = recent[0];
            return {
                allowed: false,
                retryAfterSec: Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000)),
                reason: 'minute',
            };
        }
        recent.push(now);
        this.events.set(key, recent);
        if (this.events.size > 10_000) this.prune(now);
        return { allowed: true, retryAfterSec: 0, reason: '' };
    }

    private prune(now: number): void {
        const cutoff = now - this.windowMs;
        for (const [key, times] of this.events) {
            const alive = times.filter((t) => t > cutoff);
            if (alive.length === 0) this.events.delete(key);
            else this.events.set(key, alive);
        }
    }
}

/** Contador por dia-UTC: zera sozinho a cada virada de dia. */
export class DailyCounter {
    private readonly counts = new Map<string, number>();

    constructor(private readonly maxEvents: number) {}

    check(key: string, now: number): RateVerdict {
        const day = new Date(now).toISOString().slice(0, 10);
        const mapKey = `${key}:${day}`;
        const count = this.counts.get(mapKey) ?? 0;
        if (count >= this.maxEvents) {
            const secondsIntoDay = (now / 1000) % 86_400;
            return {
                allowed: false,
                retryAfterSec: Math.max(1, Math.ceil(86_400 - secondsIntoDay)),
                reason: 'global-day',
            };
        }
        this.counts.set(mapKey, count + 1);
        if (this.counts.size > 10_000) this.prune(day);
        return { allowed: true, retryAfterSec: 0, reason: '' };
    }

    /** Contadores de dias anteriores só ocupam memória: descarta-os. */
    private prune(currentDay: string): void {
        for (const mapKey of this.counts.keys()) {
            if (!mapKey.endsWith(`:${currentDay}`)) this.counts.delete(mapKey);
        }
    }
}

/**
 * Rate limit combinado dentro deste isolate: janela curta por IP + teto diário
 * por IP + teto agregado diário local (não é uma cota global entre isolates).
 */
export class RateLimits {
    private readonly window: SlidingWindowLimiter;
    private readonly ipDay: DailyCounter;
    private readonly globalDay: DailyCounter;

    constructor(cfg: { windowMs: number; windowMax: number; dayMax: number }) {
        this.window = new SlidingWindowLimiter(cfg.windowMax, cfg.windowMs);
        this.ipDay = new DailyCounter(cfg.dayMax);
        // Teto global: 4x o limite diário por IP (pequenos grupos de usuários).
        this.globalDay = new DailyCounter(cfg.dayMax * 4);
    }

    hit(ip: string, now: number): RateVerdict {
        const perMinute = this.window.check(ip, now);
        if (!perMinute.allowed) return perMinute;
        const perDay = this.ipDay.check(ip, now);
        if (!perDay.allowed) return { ...perDay, reason: 'ip-day' };
        return this.globalDay.check('global', now);
    }
}

/** IP real do cliente (Cloudflare injeta CF-Connecting-IP). */
export function clientIp(request: Request): string {
    const cf = request.headers.get('CF-Connecting-IP')?.trim();
    if (cf) return cf;
    // X-Forwarded-For pode ser forjado em chamadas fora da infraestrutura
    // Cloudflare. Sem CF-Connecting-IP, agrupa em uma única chave segura.
    return 'unknown';
}


export interface PersistentRateLimitConfig {
    windowMs: number;
    windowMax: number;
    dayMax: number;
}

const RATE_LIMIT_UPSERT = `
    INSERT INTO api_rate_limits (scope, subject_hash, window_start_ms, count, expires_at_ms)
    VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(scope, subject_hash, window_start_ms)
    DO UPDATE SET count = api_rate_limits.count + 1, expires_at_ms = excluded.expires_at_ms
    RETURNING count
`;

async function hashSubject(value: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Persistent limits shared by Worker isolates. Only a SHA-256 hash of the
 * connecting IP is stored; raw IP addresses are never written to D1.
 * A missing/failed D1 query throws so the caller can fail closed.
 */
export async function checkPersistentRateLimits(
    db: import('./push').D1DatabaseLike,
    ip: string,
    now: number,
    config: PersistentRateLimitConfig,
    scope = 'default',
): Promise<RateVerdict> {
    const subjectHash = await hashSubject(ip || 'unknown');
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const windowRow = await db.prepare(RATE_LIMIT_UPSERT)
        .bind(`${scope}:window`, subjectHash, windowStart, windowStart + config.windowMs + 60_000)
        .first<{ count: number }>();
    if (!windowRow || !Number.isSafeInteger(windowRow.count)) throw new Error('Não foi possível confirmar o limite de solicitações.');
    if (windowRow.count > config.windowMax) {
        return {
            allowed: false,
            retryAfterSec: Math.max(1, Math.ceil((windowStart + config.windowMs - now) / 1000)),
            reason: 'minute',
        };
    }

    const dayStart = Date.UTC(
        new Date(now).getUTCFullYear(),
        new Date(now).getUTCMonth(),
        new Date(now).getUTCDate(),
    );
    const dayExpiry = dayStart + 2 * 86_400_000;
    const ipDayRow = await db.prepare(RATE_LIMIT_UPSERT)
        .bind(`${scope}:ip-day`, subjectHash, dayStart, dayExpiry)
        .first<{ count: number }>();
    if (!ipDayRow || !Number.isSafeInteger(ipDayRow.count)) throw new Error('Não foi possível confirmar o limite diário.');
    if (ipDayRow.count > config.dayMax) {
        return {
            allowed: false,
            retryAfterSec: Math.max(1, Math.ceil((dayStart + 86_400_000 - now) / 1000)),
            reason: 'ip-day',
        };
    }

    const globalDayRow = await db.prepare(RATE_LIMIT_UPSERT)
        .bind(`${scope}:global-day`, 'global', dayStart, dayExpiry)
        .first<{ count: number }>();
    if (!globalDayRow || !Number.isSafeInteger(globalDayRow.count)) throw new Error('Não foi possível confirmar o limite global.');
    if (globalDayRow.count > config.dayMax * 4) {
        return {
            allowed: false,
            retryAfterSec: Math.max(1, Math.ceil((dayStart + 86_400_000 - now) / 1000)),
            reason: 'global-day',
        };
    }

    return { allowed: true, retryAfterSec: 0, reason: '' };
}

/** Remove contadores expirados; chamado pelo Cron junto do processamento Push. */
export async function cleanupExpiredRateLimits(
    db: import('./push').D1DatabaseLike,
    now: number,
): Promise<void> {
    await db.prepare('DELETE FROM api_rate_limits WHERE expires_at_ms <= ?').bind(now).run();
}


// Rate limit em memória por isolate do Worker. É uma defesa adicional de
// melhor esforço, NÃO um limite global: contadores reiniciam e não são
// compartilhados entre isolates. Para cotas rígidas, usar Durable Objects ou
// Cloudflare Rate Limiting antes de disponibilizar o proxy publicamente.

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

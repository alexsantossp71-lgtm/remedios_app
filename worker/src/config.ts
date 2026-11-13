
// Configuração do proxy: variáveis do wrangler.toml ([vars]) + segredos.
// Funções puras, testáveis com Vitest fora do runtime do Worker.

export interface ProxyConfig {
    /** Origens que podem chamar o proxy (CORS). Exact match, separadas por vírgula. */
    allowedOrigins: string[];
    /** Modelos permitidos; '*' libera todos. */
    allowedModels: string[] | '*';
    /** Janela do rate-limit por IP (ms). */
    windowMs: number;
    /** Máximo de pedidos por IP dentro da janela. */
    windowMax: number;
    /** Máximo de pedidos por IP por dia (UTC). */
    dayMax: number;
    /** O proxy sempre exige autenticação por token, além da checagem CORS. */
    requiresToken: boolean;
}

/** Endpoint oficial da NVIDIA usado como destino do repasse. */
export const UPSTREAM_BASE = 'https://integrate.api.nvidia.com/v1';

export const DEFAULT_WINDOW_MS = 5 * 60_000;
export const DEFAULT_WINDOW_MAX = 30;
export const DEFAULT_DAY_MAX = 200;

/** Teto do corpo de um pedido (fotos são comprimidas no app; 5 MB é folgado). */
export const MAX_BODY_BYTES = 5 * 1024 * 1024;

const splitList = (value: string | undefined): string[] =>
    (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const positiveInt = (value: string | undefined, fallback: number): number => {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** Monta a configuração a partir do ambiente do Worker (vars + segredos). */
export function parseConfig(env: Record<string, string | undefined>): ProxyConfig {
    const models = splitList(env.ALLOWED_MODELS);
    return {
        allowedOrigins: splitList(env.ALLOWED_ORIGINS),
        allowedModels: models.length === 0 || models.includes('*') ? '*' : models,
        windowMs: positiveInt(env.RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS),
        windowMax: positiveInt(env.RATE_LIMIT_MAX, DEFAULT_WINDOW_MAX),
        dayMax: positiveInt(env.RATE_LIMIT_DAY_MAX, DEFAULT_DAY_MAX),
        requiresToken: true,
    };
}

/** CORS: só origens cadastradas exatamente (ex.: https://usuario.github.io). */
export function isOriginAllowed(origin: string, allowed: string[]): boolean {
    return origin.length > 0 && allowed.includes(origin);
}

/** O modelo pedido está na allowlist? Protege contra uso arbitrário do proxy. */
export function isModelAllowed(model: string, allowed: string[] | '*'): boolean {
    const clean = model.trim();
    if (!clean) return false;
    return allowed === '*' || allowed.includes(clean);
}

/** Comparação em tempo constante para o token opcional do proxy. */
export function constantTimeEquals(a: string, b: string): boolean {
    const left = new TextEncoder().encode(a);
    const right = new TextEncoder().encode(b);
    const length = Math.max(left.length, right.length);
    let diff = left.length ^ right.length;
    for (let i = 0; i < length; i++) {
        diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
    }
    return diff === 0;
}


// Proxy serverless (Cloudflare Worker) da API NVIDIA para o app "Remédio na
// Hora". Deploy separado do GitHub Pages (que continua 100% estático):
//
//   npx wrangler secret put NVIDIA_API_KEY   # chave nvapi-... do dono do proxy
//   npx wrangler deploy                      # na pasta worker/
//
// O app (GitHub Pages) chama https://<nome>.workers.dev/v1/chat/completions
// sem chave por usuário; o proxy injeta o segredo no servidor. Proteções:
// CORS por origem exata (não é autenticação), allowlist de modelos, sem
// streaming, teto de corpo e rate limit em memória por isolate.

import {
    MAX_BODY_BYTES,
    UPSTREAM_BASE,
    isModelAllowed,
    isOriginAllowed,
    parseConfig,
} from './config';
import { RateLimits, clientIp } from './limiter';
import { handlePushRequest, sendDuePushes, type D1DatabaseLike, type PushEnv } from './push';

/** Variáveis ([vars]) e segredos (`wrangler secret put`) do Worker. */
export interface WorkerEnv {
    PUSH_DB?: D1DatabaseLike;
    VAPID_PUBLIC_KEY?: string;
    VAPID_PRIVATE_KEY?: string;
    NVIDIA_API_KEY?: string;
    ALLOWED_ORIGINS?: string;
    ALLOWED_MODELS?: string;
    RATE_LIMIT_WINDOW_MS?: string;
    RATE_LIMIT_MAX?: string;
    RATE_LIMIT_DAY_MAX?: string;
}

/** Os vars podem mudar entre deploys: recria os limitadores quando mudarem. */
let cachedLimits: { key: string; limits: RateLimits } | null = null;
function limitsFor(env: WorkerEnv): RateLimits {
    const cfg = parseConfig(env as unknown as Record<string, string | undefined>);
    const key = `${cfg.windowMs}|${cfg.windowMax}|${cfg.dayMax}`;
    if (!cachedLimits || cachedLimits.key !== key) {
        cachedLimits = { key, limits: new RateLimits(cfg) };
    }
    return cachedLimits.limits;
}

function corsHeaders(origin: string, extra?: Record<string, string>): Headers {
    const headers = new Headers(extra);
    if (origin) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Vary', 'Origin');
    }
    return headers;
}

function jsonResponse(status: number, body: unknown, origin: string, extra?: Record<string, string>): Response {
    const headers = corsHeaders(origin, { 'Content-Type': 'application/json', ...extra });
    return new Response(JSON.stringify(body), { status, headers });
}

/** Repassa a resposta da NVIDIA ao navegador acrescentando os cabeçalhos CORS. */
function passThrough(upstream: Response, origin: string): Response {
    const headers = corsHeaders(origin);
    const contentType = upstream.headers.get('Content-Type');
    if (contentType) headers.set('Content-Type', contentType);
    return new Response(upstream.body, { status: upstream.status, headers });
}

export default {
    async fetch(request: Request, env: WorkerEnv): Promise<Response> {
        const cfg = parseConfig(env as unknown as Record<string, string | undefined>);
        const origin = request.headers.get('Origin') ?? '';
        const allowedOrigin = isOriginAllowed(origin, cfg.allowedOrigins) ? origin : '';

        const pathname = new URL(request.url).pathname;

        // Preflight CORS: autoriza somente a origem cadastrada.
        if (request.method === 'OPTIONS') {
            if (!allowedOrigin) return new Response(null, { status: 403 });
            return new Response(null, {
                status: 204,
                headers: corsHeaders(allowedOrigin, {
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
                    'Access-Control-Max-Age': '86400',
                }),
            });
        }

        // Verificação pública de disponibilidade; não revela se há segredo configurado.
        if (pathname === '/health' && request.method === 'GET') {
            return jsonResponse(200, { ok: true }, allowedOrigin);
        }

        if (!allowedOrigin) {
            return jsonResponse(403, { error: { message: 'Origem não autorizada para usar este proxy.' } }, '');
        }

        // Rotas de Web Push são independentes da chave NVIDIA e não recebem
        // dados clínicos. A autenticação é feita por token aleatório do dispositivo.
        if (pathname.startsWith('/push/')) {
            const verdict = limitsFor(env).hit(clientIp(request), Date.now());
            if (!verdict.allowed) {
                return jsonResponse(429, { error: { message: 'Limite de solicitações atingido. Tente novamente mais tarde.' } }, allowedOrigin, { 'Retry-After': String(verdict.retryAfterSec) });
            }
            if (!env.PUSH_DB) return jsonResponse(503, { error: { message: 'Banco de notificações indisponível.' } }, allowedOrigin);
            const pushResponse = await handlePushRequest(request, env as PushEnv, allowedOrigin);
            if (pushResponse) return pushResponse;
        }

        if (!(env.NVIDIA_API_KEY ?? '').trim()) {
            return jsonResponse(
                500,
                { error: { message: 'Proxy sem chave da NVIDIA configurada: rode `wrangler secret put NVIDIA_API_KEY`.' } },
                allowedOrigin
            );
        }

        const verdict = limitsFor(env).hit(clientIp(request), Date.now());
        if (!verdict.allowed) {
            return jsonResponse(
                429,
                { error: { message: `Limite de uso do proxy atingido. Tente novamente em ~${verdict.retryAfterSec}s.` } },
                allowedOrigin,
                { 'Retry-After': String(verdict.retryAfterSec) }
            );
        }

        const upstreamAuth = { Authorization: `Bearer ${(env.NVIDIA_API_KEY ?? '').trim()}` };
        try {
            if (pathname === '/v1/models' && request.method === 'GET') {
                const upstream = await fetch(`${UPSTREAM_BASE}/models`, {
                    headers: { ...upstreamAuth, Accept: 'application/json' },
                });
                return passThrough(upstream, allowedOrigin);
            }

            if (pathname === '/v1/chat/completions' && request.method === 'POST') {
                const contentType = request.headers.get('Content-Type') ?? '';
                if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
                    return jsonResponse(415, { error: { message: 'Envie o corpo como application/json.' } }, allowedOrigin);
                }
                const declaredLength = Number(request.headers.get('Content-Length') ?? 0);
                if (declaredLength > MAX_BODY_BYTES) {
                    return jsonResponse(413, { error: { message: 'Corpo do pedido grande demais.' } }, allowedOrigin);
                }
                const raw = await request.text();
                if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
                    return jsonResponse(413, { error: { message: 'Corpo do pedido grande demais.' } }, allowedOrigin);
                }
                let parsed: { model?: unknown; stream?: unknown } = {};
                try {
                    const decoded: unknown = JSON.parse(raw);
                    if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
                        return jsonResponse(400, { error: { message: 'O corpo deve ser um objeto JSON.' } }, allowedOrigin);
                    }
                    parsed = decoded as { model?: unknown; stream?: unknown };
                } catch {
                    return jsonResponse(400, { error: { message: 'Corpo não é um JSON válido.' } }, allowedOrigin);
                }
                if (parsed.stream === true) {
                    return jsonResponse(
                        400,
                        { error: { message: 'Streaming não é suportado neste proxy (use stream: false).' } },
                        allowedOrigin
                    );
                }
                if (!isModelAllowed(typeof parsed.model === 'string' ? parsed.model : '', cfg.allowedModels)) {
                    return jsonResponse(
                        403,
                        { error: { message: 'Modelo não permitido neste proxy. Ajuste ALLOWED_MODELS no wrangler.toml.' } },
                        allowedOrigin
                    );
                }
                const upstream = await fetch(`${UPSTREAM_BASE}/chat/completions`, {
                    method: 'POST',
                    headers: { ...upstreamAuth, 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: raw,
                });
                return passThrough(upstream, allowedOrigin);
            }
        } catch {
            return jsonResponse(
                502,
                { error: { message: 'O proxy não conseguiu falar com a API da NVIDIA agora. Tente novamente.' } },
                allowedOrigin
            );
        }

        return jsonResponse(
            pathname === '/v1/models' || pathname === '/v1/chat/completions' ? 405 : 404,
            { error: { message: 'Rota ou método não permitido. Use /v1/chat/completions (POST), /v1/models (GET) ou /health (GET).' } },
            allowedOrigin
        );
    },
    async scheduled(_controller: { scheduledTime: number; cron: string }, env: WorkerEnv, context: { waitUntil(promise: Promise<unknown>): void }): Promise<void> {
        context.waitUntil(sendDuePushes(env as PushEnv));
    },
};

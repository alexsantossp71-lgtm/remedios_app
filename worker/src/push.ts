import { buildPushPayload, type PushSubscription, type VapidKeys } from '@block65/webcrypto-web-push';

export interface PushEnv {
  PUSH_DB: D1DatabaseLike;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
}

interface D1Result<T = unknown> { results?: T[]; success?: boolean; meta?: { changes?: number }; }
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}
export interface D1DatabaseLike {
  prepare(query: string): D1Statement;
  batch<T = unknown>(statements: D1Statement[]): Promise<D1Result<T>[]>;
}

const encoder = new TextEncoder();
const json = (status: number, body: unknown, origin: string): Response =>
  new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json',
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Cache-Control': 'no-store',
  } });

async function tokenHash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function authorizedSubscription(request: Request, env: PushEnv) {
  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return null;
  return env.PUSH_DB.prepare('SELECT id FROM push_subscriptions WHERE token_hash = ?')
    .bind(await tokenHash(token)).first<{ id: string }>();
}

export async function handlePushRequest(request: Request, env: PushEnv, origin: string): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/push/')) return null;
  if (request.method !== 'POST') return json(405, { error: 'Método não permitido.' }, origin);
  if (!env.PUSH_DB) return json(503, { error: 'Banco de notificações indisponível.' }, origin);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid');
    body = parsed as Record<string, unknown>;
  } catch {
    return json(400, { error: 'JSON inválido.' }, origin);
  }

  if (url.pathname === '/push/register') {
    const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    const sub = body.subscription as PushSubscription | undefined;
    const endpoint = typeof sub?.endpoint === 'string' ? sub.endpoint : '';
    let endpointHost = '';
    try { endpointHost = new URL(endpoint).hostname.toLowerCase(); } catch { /* endpoint inválido */ }
    const trustedPushHost = endpointHost === 'fcm.googleapis.com' ||
      (endpointHost === 'push.services.mozilla.com' || endpointHost.endsWith('.push.services.mozilla.com')) || endpointHost === 'web.push.apple.com' ||
      endpointHost.endsWith('.notify.windows.com') || endpointHost.endsWith('.wns.windows.com');
    const p256dh = typeof sub?.keys?.p256dh === 'string' ? sub.keys.p256dh : '';
    const auth = typeof sub?.keys?.auth === 'string' ? sub.keys.auth : '';
    if (!/^[A-Za-z0-9_-]{40,100}$/.test(token) || !endpoint.startsWith('https://') || !trustedPushHost || endpoint.length > 2048 || !p256dh || !auth) {
      return json(400, { error: 'Inscrição Push inválida.' }, origin);
    }
    const now = Date.now();
    const id = crypto.randomUUID();
    await env.PUSH_DB.prepare(`
      INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, token_hash, created_at_ms, updated_at_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth,
        token_hash=excluded.token_hash, updated_at_ms=excluded.updated_at_ms
    `).bind(id, endpoint, p256dh, auth, await tokenHash(token), now, now).run();
    return json(200, { ok: true }, origin);
  }

  const subscription = await authorizedSubscription(request, env);
  if (!subscription) return json(401, { error: 'Dispositivo não autorizado.' }, origin);

  if (url.pathname === '/push/schedule') {
    const events = Array.isArray(body.events) ? body.events : null;
    if (!events || events.length > 500 || events.some((v) => !Number.isSafeInteger(v) || (v as number) < Date.now() || (v as number) > Date.now() + 31 * 86400000)) {
      return json(400, { error: 'Agenda inválida. Envie apenas horários futuros dentro dos próximos 31 dias.' }, origin);
    }
    const statements: D1Statement[] = [
      env.PUSH_DB.prepare('DELETE FROM scheduled_notifications WHERE subscription_id = ? AND sent_at_ms IS NULL')
        .bind(subscription.id),
      ...[...new Set(events as number[])].map((fireAt) =>
        env.PUSH_DB.prepare('INSERT INTO scheduled_notifications (id, subscription_id, fire_at_ms, created_at_ms) VALUES (?, ?, ?, ?)')
          .bind(crypto.randomUUID(), subscription.id, fireAt, Date.now())
      ),
    ];
    await env.PUSH_DB.batch(statements);
    return json(200, { ok: true, scheduled: new Set(events).size }, origin);
  }

  if (url.pathname === '/push/unregister') {
    await env.PUSH_DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(subscription.id).run();
    return json(200, { ok: true }, origin);
  }

  return json(404, { error: 'Rota não encontrada.' }, origin);
}

const MAX_PUSH_ATTEMPTS = 5;
const PUSH_CLAIM_LEASE_MS = 30_000;
const PUSH_REQUEST_TIMEOUT_MS = 10_000;
const PUSH_RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000] as const;

interface DuePush {
  notification_id: string;
  subscription_id: string;
  attempts: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Claims a small batch atomically before contacting external Push services.
 * The lease allows another Cron execution to recover work if an isolate stops.
 */
export async function sendDuePushes(env: PushEnv): Promise<void> {
  const publicKey = env.VAPID_PUBLIC_KEY ?? '';
  const privateKey = env.VAPID_PRIVATE_KEY ?? '';
  if (!publicKey || !privateKey || !env.PUSH_DB) return;

  const now = Date.now();
  const claimToken = crypto.randomUUID();
  const claimedUntil = now + PUSH_CLAIM_LEASE_MS;

  // UPDATE ... RETURNING makes the claim a single atomic D1 statement. A
  // concurrent Cron invocation will no longer see these rows as claimable.
  await env.PUSH_DB.prepare(`
    UPDATE scheduled_notifications
    SET claim_token = ?, claimed_until_ms = ?
    WHERE id IN (
      SELECT id FROM scheduled_notifications
      WHERE sent_at_ms IS NULL
        AND failed_at_ms IS NULL
        AND attempts < ?
        AND fire_at_ms <= ?
        AND (next_attempt_at_ms IS NULL OR next_attempt_at_ms <= ?)
        AND (claimed_until_ms IS NULL OR claimed_until_ms <= ?)
      ORDER BY fire_at_ms ASC
      LIMIT 5
    )
    RETURNING id
  `).bind(claimToken, claimedUntil, MAX_PUSH_ATTEMPTS, now, now, now).all();

  const due = await env.PUSH_DB.prepare(`
    SELECT n.id AS notification_id, n.subscription_id, n.attempts,
      s.endpoint, s.p256dh, s.auth
    FROM scheduled_notifications n
    JOIN push_subscriptions s ON s.id = n.subscription_id
    WHERE n.claim_token = ? AND n.claimed_until_ms = ?
    ORDER BY n.fire_at_ms ASC
  `).bind(claimToken, claimedUntil).all<DuePush>();

  const vapid: VapidKeys = {
    subject: 'https://alexsantossp71-lgtm.github.io/remedios_app/',
    publicKey,
    privateKey,
  };

  const markFailure = async (item: DuePush, status: number | null): Promise<void> => {
    const attempts = item.attempts + 1;
    const failedAt = attempts >= MAX_PUSH_ATTEMPTS ? Date.now() : null;
    const nextAttempt = failedAt === null
      ? Date.now() + PUSH_RETRY_DELAYS_MS[Math.min(attempts - 1, PUSH_RETRY_DELAYS_MS.length - 1)]
      : null;
    await env.PUSH_DB.prepare(`
      UPDATE scheduled_notifications
      SET attempts = ?, next_attempt_at_ms = ?, failed_at_ms = ?,
          last_status = ?, claim_token = NULL, claimed_until_ms = NULL
      WHERE id = ? AND claim_token = ?
    `).bind(attempts, nextAttempt, failedAt, status, item.notification_id, claimToken).run();
  };

  await Promise.all((due.results ?? []).map(async (item) => {
    try {
      const subscription: PushSubscription = {
        endpoint: item.endpoint,
        expirationTime: null,
        keys: { p256dh: item.p256dh, auth: item.auth },
      };
      const payload = await buildPushPayload({
        data: JSON.stringify({
          title: 'Remédio na Hora',
          body: 'Está na hora de conferir seus lembretes no aplicativo.',
        }),
        options: { ttl: 300, urgency: 'high' },
      }, subscription, vapid);
      const response = await fetch(item.endpoint, {
        ...payload,
        body: new Uint8Array(payload.body).buffer as ArrayBuffer,
        signal: AbortSignal.timeout(PUSH_REQUEST_TIMEOUT_MS),
      });

      if (response.ok) {
        await env.PUSH_DB.prepare(`
          UPDATE scheduled_notifications
          SET sent_at_ms = ?, attempts = attempts + 1, last_status = ?,
              next_attempt_at_ms = NULL, claim_token = NULL, claimed_until_ms = NULL
          WHERE id = ? AND claim_token = ?
        `).bind(Date.now(), response.status, item.notification_id, claimToken).run();
        return;
      }

      if (response.status === 404 || response.status === 410) {
        // A inscrição expirou ou foi removida pelo provedor; FK cascade limpa a agenda.
        await env.PUSH_DB.prepare('DELETE FROM push_subscriptions WHERE id = ?')
          .bind(item.subscription_id).run();
        return;
      }

      await markFailure(item, response.status);
    } catch {
      // Não armazenar mensagem/URL/inscrição do provedor: apenas o contador técnico.
      await markFailure(item, null);
    }
  }));
}

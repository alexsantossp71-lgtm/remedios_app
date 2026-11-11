# Proxy de IA (Cloudflare Worker) — "IA funcionando de fábrica"

O GitHub Pages continua **100% estático**; este Worker é um deploy separado que
mantém a `NVIDIA_API_KEY` no servidor. Assim, os usuários do app **não precisam
criar a própria chave `nvapi-`**: todos os recursos de IA funcionam assim que o
app aponta para o proxy (URL fixa nas Configurações ou embutida no build).

## O que o proxy faz

- Repassa `POST /v1/chat/completions` e `GET /v1/models` para
  `https://integrate.api.nvidia.com/v1`, injetando o segredo no servidor.
- **CORS por origem exata** (`ALLOWED_ORIGINS`) — outros sites não conseguem usar.
- **Allowlist de modelos** (`ALLOWED_MODELS`) e bloqueio de `stream: true`.
- **Rate limit**: 30 pedidos por IP a cada 5 min, 200 por IP por dia e um teto
  global diário (contagem em memória por isolate — suficiente no plano gratuito;
  para limites estritos use Durable Objects/KV depois).
- **Token opcional** (`PROXY_TOKEN`): se o segredo existir, o app precisa enviar
  o mesmo valor no campo "Token do proxy" das Configurações.

## Deploy (uma vez)

```bash
cd worker
npx wrangler login
npx wrangler secret put NVIDIA_API_KEY   # cole a chave nvapi-...
npx wrangler deploy
```

Edite `ALLOWED_ORIGINS` no `wrangler.toml` com a URL real do seu Pages
(`https://<usuario>.github.io`) antes do deploy. Depois confira:

```bash
curl https://remedios-ai-proxy.<sua-conta>.workers.dev/health
# {"ok":true,"hasKey":true}
```

## Apontar o app para o proxy

1. **Por dispositivo:** Configurações → "Proxy de IA" → cole a URL do Worker.
2. **Padrão para todos (recomendado):** defina a URL em tempo de build:

```bash
# .env.local (ou variable de ambiente no CI)
VITE_DEFAULT_PROXY_URL=https://remedios-ai-proxy.<sua-conta>.workers.dev
```

Com `VITE_DEFAULT_PROXY_URL` definido, qualquer pessoa já usa a IA sem
configurar nada — quem quiser a própria chave continua podendo informá-la.

Segurança: a chave nunca vai para o bundle do app; o que o proxy expõe é só a
URL pública, protegida por CORS + allowlist + rate limit.

## Testes

Os módulos `config.ts` e `limiter.ts` são puros e testados pelo Vitest do
repositório (`pnpm test` inclui `worker/src/*.test.ts`).

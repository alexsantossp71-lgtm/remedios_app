# Proxy de IA (Cloudflare Worker) — "IA funcionando de fábrica"

O GitHub Pages continua **100% estático**; este Worker é um deploy separado que
mantém a `NVIDIA_API_KEY` no servidor. Assim, os usuários do app **não precisam
criar a própria chave `nvapi-`**: todos os recursos de IA funcionam assim que o
app aponta para o proxy (URL fixa nas Configurações ou embutida no build).

## O que o proxy faz

- Repassa `POST /v1/chat/completions` e `GET /v1/models` para
  `https://integrate.api.nvidia.com/v1`, injetando o segredo no servidor.
- **CORS por origem exata** (`ALLOWED_ORIGINS`) — controla navegadores, mas não autentica clientes.
- **Allowlist de modelos** (`ALLOWED_MODELS`) e bloqueio de `stream: true`.
- **Token obrigatório** (`PROXY_TOKEN`): toda chamada à API precisa apresentar
  o segredo no cabeçalho `x-proxy-token`; sem ele o Worker responde 401 e, se o
  segredo não estiver configurado no servidor, responde 503.
- **Rate limit de melhor esforço**: 30 pedidos por IP a cada 5 min e 200 por IP
  por dia. A contagem é em memória por isolate, não é global nem persistente;
  para cotas rígidas use Cloudflare Rate Limiting ou Durable Objects.

## Deploy (uma vez)

```bash
cd worker
npx wrangler login
npx wrangler secret put NVIDIA_API_KEY   # cole a chave nvapi-...
npx wrangler secret put PROXY_TOKEN      # crie um token longo e aleatório e guarde-o em local seguro
npx wrangler deploy
```

Edite `ALLOWED_ORIGINS` no `wrangler.toml` com a URL real do seu Pages
(`https://<usuario>.github.io`) antes do deploy. Depois confira:

```bash
curl https://remedios-ai-proxy.<sua-conta>.workers.dev/health
# {"ok":true}
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

No GitHub Actions a variável já está ligada ao build: basta criar
`VITE_DEFAULT_PROXY_URL` em **Settings → Secrets and variables → Actions →
Variables** e rodar o deploy novamente (re-run do workflow ou push).

Segurança: não publique nenhum dos dois secrets. O rate limit em memória é
apenas uma defesa adicional e pode reiniciar entre isolates.

## Testes

Os módulos `config.ts` e `limiter.ts` são puros e testados pelo Vitest do
repositório (`pnpm test` inclui `worker/src/*.test.ts`).

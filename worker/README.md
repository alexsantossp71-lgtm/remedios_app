# Proxy interno de IA (Cloudflare Worker)

O GitHub Pages continua estático. Este Worker mantém a chave NVIDIA_API_KEY
exclusivamente no servidor e atende automaticamente o aplicativo Remédio na Hora.
O usuário final não precisa cadastrar chave, URL, token ou modelo.

## Proteções

- A chave NVIDIA é um secret do Cloudflare Worker e nunca é enviada ao navegador.
- CORS permite apenas as origens listadas em ALLOWED_ORIGINS; isso restringe
  navegadores, mas não é autenticação contra chamadas feitas fora do navegador.
- Allowlist de modelos e bloqueio de streaming.
- Limite de tamanho do corpo e rate limit por IP (melhor esforço, em memória por
  isolate; para cotas rígidas use Cloudflare Rate Limiting ou Durable Objects).

**Importante:** como o aplicativo é público e não possui login, o endpoint do
proxy também é acessível publicamente por clientes que contornem CORS. Os limites
atuais reduzem abuso, mas não equivalem a autenticação. Para uso público com
controle mais forte, adicione Cloudflare Turnstile ou autenticação de usuário e
limites de cobrança no provedor.

## Secrets necessários

Somente:
- NVIDIA_API_KEY — chave da conta NVIDIA.
- POLLINATIONS_API_KEY — chave secreta `sk_` do Pollinations (opcional; habilita somente as rotas experimentais `/v1/pollinations/*`).
- CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID — para o deploy via GitHub Actions.

O workflow publica automaticamente NVIDIA_API_KEY no Worker. Para habilitar o teste Pollinations, crie uma chave secreta em https://enter.pollinations.ai e cadastre-a nos GitHub Actions Secrets com o nome `POLLINATIONS_API_KEY`; o workflow a publicará no Worker. Não crie nem distribua token compartilhado para os usuários.

A integração experimental usa `https://gen.pollinations.ai/v1/chat/completions` e `GET /v1/models`, com autenticação Bearer no servidor. Ela não é usada pelas funções normais do aplicativo e não substitui a NVIDIA. Modelos permitidos ficam em `POLLINATIONS_ALLOWED_MODELS` no `wrangler.toml`. Os testes de comparação usam somente casos sintéticos. Não envie dados reais de pacientes até concluir a avaliação de privacidade, retenção e conformidade do provedor e dos modelos de destino.

## Deploy e teste

O workflow .github/workflows/deploy-proxy.yml publica o Worker quando alterações
na pasta worker/ chegam à branch main. O endereço já está configurado no build
do frontend:

https://remedios-ai-proxy.alexsantossp71.workers.dev

Teste a disponibilidade em /health, que deve responder {"ok":true}.

## Testes

pnpm test inclui os testes unitários do Worker.

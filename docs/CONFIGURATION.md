# Configuração e variáveis de ambiente

## Frontend

| Nome | Onde | Sensibilidade | Uso |
|---|---|---|---|
| `VITE_DEFAULT_PROXY_URL` | Build GitHub Actions | URL pública, não segredo | Endereço do Worker injetado no build |
| `base` | `vite.config.ts` | Configuração | Caminho `/remedios_app/` no GitHub Pages |

Variáveis com prefixo `VITE_` são incorporadas ao bundle e ficam visíveis ao usuário. Nunca colocar API keys, tokens privados ou senhas em variáveis Vite.

## Cloudflare Worker — vars

Configuradas em `worker/wrangler.toml` ou ambiente:
- `ALLOWED_ORIGINS`: origens CORS permitidas, separadas por vírgula.
- `ALLOWED_MODELS`: modelos NVIDIA aceitos.
- `POLLINATIONS_ALLOWED_MODELS`: modelos Pollinations aceitos.
- `RATE_LIMIT_WINDOW_MS`: duração da janela de rate limit.
- `RATE_LIMIT_MAX`: máximo de requisições por IP na janela.
- `RATE_LIMIT_DAY_MAX`: máximo por IP por dia UTC.
- `VAPID_PUBLIC_KEY`: chave pública Push.
- `PUSH_DB`: binding D1.

## Cloudflare Worker — secrets

- `NVIDIA_API_KEY`: obrigatório para rotas NVIDIA.
- `VAPID_PRIVATE_KEY`: chave privada VAPID.
- `POLLINATIONS_API_KEY`: opcional; habilita as rotas Pollinations.

Os valores dos secrets nunca devem ser escritos em Markdown, commits, screenshots, issues ou logs.

## Limites configurados no arquivo consultado

- Janela: 300.000 ms (5 minutos).
- Limite: 30 requisições por IP por janela.
- Limite diário: 200 por IP.
- Limite diário agregado implementado no código: quatro vezes o limite por IP dentro de cada isolate.
- Corpo máximo para chat: 5 MiB.
- Pollinations: allowlist de modelos específica.

**Atenção:** os limitadores atuais são mantidos em memória por isolate. Eles não constituem cotas globais rígidas entre instâncias e podem reiniciar. Para controle de custo/abuso em escala, considerar Cloudflare Rate Limiting ou Durable Objects.

## GitHub Actions

O workflow injeta a URL pública do proxy no build e publica o diretório `dist`. O workflow de deploy do Worker utiliza secrets do repositório/ambiente para autenticação Cloudflare e credenciais de provedor. Consultar os workflows atuais antes de alterar nomes de secrets.

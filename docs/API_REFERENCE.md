# Referência de API — Cloudflare Worker

**Base URL atualmente configurada no cliente:** `https://remedios-ai-proxy.alexsantossp71.workers.dev`  
**Implementação:** `worker/src/index.ts`, `worker/src/push.ts`.  
**Formato:** JSON; streaming não é suportado nas rotas de chat.

## Regras comuns

- As rotas de aplicação verificam o cabeçalho `Origin` contra `ALLOWED_ORIGINS` por correspondência exata. Isso é CORS, não autenticação de usuário.
- O preflight `OPTIONS` permite métodos GET, POST e OPTIONS e cabeçalhos Content-Type, Accept e Authorization.
- As respostas de erro de proxy usam estrutura `{ "error": { "message": "..." } }`, salvo respostas específicas do módulo Push.
- O proxy aplica limites de corpo e modelos permitidos.
- Segredos de provedores são injetados no Worker, nunca enviados pelo navegador.

## Rotas NVIDIA

| Método | Caminho | Finalidade |
|---|---|---|
| GET | `/health` | Verificação pública de disponibilidade; retorna `{ "ok": true }` |
| GET | `/v1/models` | Consulta catálogo NVIDIA |
| POST | `/v1/chat/completions` | Encaminha Chat Completions para NVIDIA |
| POST | `/v1/diagnostics/chat/completions` | Teste de modelo com prompts sintéticos fixos |

### POST /v1/chat/completions

Recebe corpo compatível com Chat Completions: `model`, `messages` e parâmetros suportados pelo provedor. O Worker exige JSON, rejeita `stream: true`, verifica a allowlist `ALLOWED_MODELS` e encaminha o corpo para `https://integrate.api.nvidia.com/v1/chat/completions`.

Limite de corpo: 5 MiB. O Worker não define um contrato de saída próprio: repassa status, corpo e Content-Type da NVIDIA.

### POST /v1/diagnostics/chat/completions

Corpo: `{ "model": "<id>", "task": "interactions" | "schedule" }`. O modelo deve existir no catálogo acessível à chave NVIDIA. O corpo é limitado a 2.000 bytes. O Worker substitui o conteúdo por um de dois prompts fixos e fictícios; o chamador não pode enviar prompts arbitrários nessa rota. A rota tem limitador separado.

## Rotas Pollinations

| Método | Caminho | Finalidade |
|---|---|---|
| GET | `/v1/pollinations/models` | Consulta catálogo Pollinations |
| POST | `/v1/pollinations/chat/completions` | Encaminha Chat Completions para Pollinations |

Dependem de `POLLINATIONS_API_KEY`. O modelo deve estar em `POLLINATIONS_ALLOWED_MODELS`. A rota POST exige JSON, rejeita streaming e limita o corpo a 5 MiB. Destino upstream: `https://gen.pollinations.ai/v1`.

## Rotas Web Push

Todas as rotas Push exigem POST e corpo JSON. O Worker aplica rate limit e usa token Bearer aleatório do dispositivo.

| Método | Caminho | Autorização | Corpo |
|---|---|---|---|
| POST | `/push/register` | Token Bearer novo, enviado também no registro | `{ "subscription": PushSubscriptionJSON }` |
| POST | `/push/schedule` | Token Bearer registrado | `{ "events": [timestamp_ms, ...] }` |
| POST | `/push/unregister` | Token Bearer registrado | `{}` |

### Registro

O Worker valida formato do token, endpoint HTTPS, host de Push permitido e chaves `p256dh` e `auth`. Armazena endpoint, chaves técnicas, hash SHA-256 do token e timestamps na D1.

### Agendamento

Aceita no máximo 500 timestamps inteiros seguros, futuros e dentro dos próximos 31 dias. A agenda pendente anterior da inscrição é substituída pelos eventos enviados. O cliente atual envia apenas instantes UTC, sem nome, dose ou histórico de medicamentos.

### Cancelamento

Remove a inscrição associada ao token. O cliente também cancela a inscrição do PushManager e remove o token local.

## Códigos de resposta relevantes

- 200: operação aceita.
- 204: preflight CORS aceito.
- 400: JSON ou payload inválido.
- 401: token Push inválido/não autorizado.
- 403: origem ou modelo não permitido.
- 404: rota não encontrada.
- 405: método não permitido.
- 413: corpo acima do limite.
- 415: Content-Type não aceito.
- 429: limite de solicitações atingido; observar `Retry-After`.
- 502: falha de comunicação com provedor.
- 503: serviço/provedor/banco não configurado ou indisponível.
- 500: configuração obrigatória NVIDIA ausente.

## Observações

Esta referência é derivada do código atual. Não é uma especificação OpenAPI publicada. Ao mudar rotas, payloads ou status, atualizar este arquivo e os testes de contrato. Nunca incluir tokens reais, chaves VAPID privadas ou credenciais nesta documentação.

# Esquema do Cloudflare D1 — notificações Push

## Estado da inspeção

O binding `PUSH_DB` aponta para o banco `remedios-push`, configurado em `worker/wrangler.toml`.

**Migrações versionadas:**
- `0001_push_schema.sql`: cria `push_subscriptions`, `scheduled_notifications`, índices e chave estrangeira.
- `0002_push_delivery_reliability.sql`: adiciona token/expiração de reserva, data da próxima tentativa, falha terminal e último status HTTP para tornar o processamento mais resiliente.

A existência da migração no repositório não comprova, por si só, que ela foi aplicada no banco remoto correto. A confirmação do estado remoto exige consulta autorizada ao Cloudflare D1.

## 1. Tabela `push_subscriptions`

| Coluna | Tipo SQL | Restrições / uso |
|---|---|---|
| `id` | TEXT | PRIMARY KEY |
| `endpoint` | TEXT | NOT NULL, UNIQUE; endpoint Push do navegador |
| `p256dh` | TEXT | NOT NULL; chave pública da inscrição |
| `auth` | TEXT | NOT NULL; material de autenticação da inscrição |
| `token_hash` | TEXT | NOT NULL, UNIQUE; hash do token Bearer |
| `created_at_ms` | INTEGER | NOT NULL; epoch milliseconds |
| `updated_at_ms` | INTEGER | NOT NULL; epoch milliseconds |
| `expires_at_ms` | INTEGER | Opcional |

## 2. Tabela `scheduled_notifications`

| Coluna | Tipo SQL | Restrições / uso |
|---|---|---|
| `id` | TEXT | PRIMARY KEY |
| `subscription_id` | TEXT | NOT NULL; FK para `push_subscriptions(id)`, ON DELETE CASCADE |
| `fire_at_ms` | INTEGER | NOT NULL; instante previsto em epoch milliseconds |
| `created_at_ms` | INTEGER | NOT NULL; criação em epoch milliseconds |
| `sent_at_ms` | INTEGER | Opcional; nulo enquanto pendente |
| `attempts` | INTEGER | NOT NULL, DEFAULT 0; número de tentativas realizadas |
| `claim_token` | TEXT | Opcional; identificador técnico da execução que reservou o evento |
| `claimed_until_ms` | INTEGER | Opcional; expiração da reserva (lease) |
| `next_attempt_at_ms` | INTEGER | Opcional; próxima tentativa após falha temporária |
| `failed_at_ms` | INTEGER | Opcional; falha terminal após o limite de tentativas |
| `last_status` | INTEGER | Opcional; último status HTTP do provedor, sem corpo da resposta |

## 3. Índices versionados

- `idx_scheduled_due` em `(sent_at_ms, fire_at_ms)`.
- `idx_scheduled_subscription` em `(subscription_id, fire_at_ms)`.
- `idx_scheduled_retry` em `(sent_at_ms, failed_at_ms, next_attempt_at_ms, claimed_until_ms, fire_at_ms)`.

A primeira migração usa `CREATE TABLE IF NOT EXISTS` e `CREATE INDEX IF NOT EXISTS`. A segunda adiciona colunas com `ALTER TABLE`; deve ser aplicada uma única vez pelo controle de migrações do Wrangler.

## 4. Comportamento observado no código

- O código faz upsert com conflito em `endpoint`, procura inscrição por `token_hash` e remove inscrição por `id`.
- Eventos pendentes são selecionados pelo horário de vencimento e processados pelo Worker.
- A mensagem Push é genérica e não deve incluir medicamento, dose ou histórico clínico.
- Respostas de endpoint expirado/inválido podem levar à remoção da inscrição.
- O Worker limita tentativas de envio e mantém os horários em UTC/epoch milliseconds.

## 5. Verificações operacionais ainda necessárias

1. Confirmar no painel/CLI Cloudflare que a migração `0001_push_schema.sql` foi aplicada no banco remoto `remedios-push`.
2. Comparar o schema remoto com as migrações versionadas, sem exportar ou publicar dados de usuários.
3. Testar aplicação da migração em banco de desenvolvimento e validar o procedimento de rollback/recuperação.
4. Definir limpeza e retenção de eventos enviados e inscrições obsoletas.
5. Confirmar backup e restauração do D1, com acesso restrito e ensaio documentado.
6. Registrar o responsável e a data da última verificação operacional.

Nunca executar alteração destrutiva em produção sem backup, revisão e plano de reversão. Não publicar endpoints Push, tokens, chaves privadas ou dumps com dados reais.

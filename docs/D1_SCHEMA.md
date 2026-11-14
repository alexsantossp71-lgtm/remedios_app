# Esquema do Cloudflare D1 — notificações Push

## Estado da inspeção

O binding PUSH_DB aponta para o banco remedios-push, configurado em worker/wrangler.toml. O código worker/src/push.ts consulta e altera duas tabelas: push_subscriptions e scheduled_notifications.

**Limite importante:** não foi localizada uma migração SQL versionada que declare o DDL oficial. Este documento descreve o contrato exigido pelo código; não afirma tipos, índices, constraints ou foreign keys que não foram verificados no banco.

## Tabela lógica: push_subscriptions

| Coluna | Uso observado |
|---|---|
| id | Identificador interno |
| endpoint | URL do serviço Push do navegador |
| p256dh | Chave pública da inscrição |
| auth | Segredo de autenticação da inscrição |
| token_hash | Hash SHA-256 do token Bearer |
| created_at_ms | Criação em epoch milliseconds |
| updated_at_ms | Última atualização em epoch milliseconds |

O código faz upsert com conflito em endpoint, procura inscrição por token_hash e remove inscrição por id.

## Tabela lógica: scheduled_notifications

| Coluna | Uso observado |
|---|---|
| id | Identificador do evento |
| subscription_id | Referência à inscrição |
| fire_at_ms | Instante previsto, epoch milliseconds |
| created_at_ms | Criação do evento |
| sent_at_ms | Nulo enquanto pendente; preenchido após envio ou encerramento |
| attempts | Contagem de tentativas |

O Worker seleciona eventos não encerrados cujo fire_at_ms já venceu, ordenados pelo horário e com limite de cinco por execução.

## Invariantes observados

- Tokens são validados por formato e armazenados como SHA-256.
- Endpoint deve usar HTTPS e host Push permitido.
- Eventos devem ser inteiros seguros, futuros e limitados a 31 dias.
- Cada agendamento aceita até 500 eventos.
- O novo agendamento substitui os eventos pendentes anteriores em lote.
- A mensagem Push é genérica e não inclui medicamento, dose ou histórico.
- Respostas 404/410 removem a inscrição.
- Falhas são tentadas novamente até cinco vezes.

## Verificações necessárias no painel D1

1. Exportar o DDL real com ferramenta autorizada, sem publicar dados.
2. Versionar migrações SQL em diretório próprio.
3. Confirmar índices para endpoint, token_hash e seleção de eventos pendentes.
4. Confirmar foreign key de scheduled_notifications.subscription_id e política de exclusão.
5. Confirmar constraints de unicidade e tipos numéricos.
6. Testar migrações em banco de desenvolvimento.
7. Definir limpeza de eventos enviados e inscrições obsoletas.

Nunca executar alteração destrutiva em produção sem backup, revisão e plano de reversão. Não publicar endpoints Push, chaves ou dumps com dados reais.

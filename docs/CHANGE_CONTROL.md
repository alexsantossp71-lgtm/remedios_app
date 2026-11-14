# Controle de mudanças técnicas

## Objetivo

Manter rastreabilidade entre alterações de código, dados, contratos de integração, infraestrutura e documentação.

## Fluxo recomendado

1. Criar branch específica a partir de `main`.
2. Definir escopo e risco da mudança.
3. Alterar código e testes.
4. Atualizar documentos afetados.
5. Executar `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build`.
6. Abrir Pull Request com resumo, motivação, riscos, testes e plano de rollback.
7. Revisar diferenças e checks.
8. Integrar após resolver conflitos e obter aprovação.
9. Verificar o ambiente publicado e registrar a versão.

## Matriz de atualização documental

| Mudança | Documentos que devem ser revisados |
|---|---|
| Novo módulo ou fluxo | ARCHITECTURE, DOMAIN_MODEL, FEATURES/USER_FLOWS (quando criados) |
| Tipo ou persistência | DOMAIN_MODEL, DATA_STORAGE, SECURE_STORAGE |
| Rota/payload Worker | API_REFERENCE, AI_INTEGRATION ou PUSH_NOTIFICATIONS, TESTING |
| Provedor/modelo IA | AI_INTEGRATION, CONFIGURATION, SECURITY |
| Criptografia | SECURE_STORAGE, SECURITY, THREAT_MODEL |
| Push | PUSH_NOTIFICATIONS, API_REFERENCE, CONFIGURATION |
| Build/hosting/PWA | DEPLOYMENT, PWA_OFFLINE, CONFIGURATION |
| Incidente ou vulnerabilidade | SECURITY, THREAT_MODEL, ERROR_HANDLING |

## Regras

- Não incluir segredos ou dados pessoais em commits.
- Não declarar testes aprovados sem executar os comandos.
- Não marcar recurso planejado como implementado.
- Registrar alterações incompatíveis de dados e plano de migração.
- Atualizar o CHANGELOG quando houver release.

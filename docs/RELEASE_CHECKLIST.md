# Checklist de release e aceite técnico

## 1. Preparação

- [ ] Confirmar branch, commit e PR.
- [ ] Revisar diff completo.
- [ ] Atualizar documentação de arquitetura, dados, API e configuração.
- [ ] Verificar ausência de credenciais, tokens, dados reais e backups.
- [ ] Confirmar compatibilidade dos dados locais e do cofre.

## 2. Qualidade automatizada

Executar na raiz:

    pnpm install --frozen-lockfile
    pnpm lint
    pnpm typecheck
    pnpm test
    pnpm build

- [ ] Todos os comandos terminam com sucesso.
- [ ] Testes novos cobrem a alteração.
- [ ] Revisar warnings e lockfile.

## 3. Testes funcionais

- [ ] Criar, editar e excluir lembrete.
- [ ] Conferir frequência, duração, horários e histórico.
- [ ] Confirmar persistência após recarregar.
- [ ] Testar bloqueio e desbloqueio do cofre.
- [ ] Testar exportação e importação com dados fictícios.
- [ ] Testar médicos, consultas, planos, exames e resultados.
- [ ] Verificar permissões e notificações.
- [ ] Testar navegação, modo escuro e PWA.
- [ ] Testar viewport móvel/desktop e teclado.

## 4. IA

- [ ] Confirmar proxy e provedor disponíveis.
- [ ] Testar com dados sintéticos.
- [ ] Verificar timeout, fallback e respostas inválidas.
- [ ] Confirmar que otimização não altera dose, frequência ou duração.
- [ ] Confirmar revisão explícita antes de aplicar.
- [ ] Verificar ausência de dados clínicos nos logs.

## 5. Worker e Push

- [ ] Confirmar secrets por nome, sem revelar valores.
- [ ] Confirmar CORS e allowlists.
- [ ] Confirmar rate limits e limites de payload.
- [ ] Confirmar binding D1 e migrações aplicadas.
- [ ] Testar registro, agendamento, envio e cancelamento.
- [ ] Confirmar mensagem genérica.
- [ ] Confirmar Cron Trigger e tratamento de falhas.

## 6. Publicação

- [ ] CI aprovado.
- [ ] Revisão e aprovação da PR.
- [ ] Publicar frontend e Worker conforme escopo.
- [ ] Validar URL, assets, console e endpoint /health.
- [ ] Executar smoke tests com dados fictícios.
- [ ] Monitorar erros e consumo.
- [ ] Registrar commit, versão e resultado.

## 7. Critérios de bloqueio

Não publicar quando houver falha de build/testes críticos; segredo ou dado pessoal no diff; migração D1 sem revisão/backup; regressão de armazenamento; comportamento clínico inseguro da IA; rollback inviável para mudança destrutiva; incidente em investigação sem contenção adequada.

## 8. Registro do release

Versão/commit; data; responsável; PR; componentes alterados; migrações; CI; smoke tests; plano de rollback; incidentes conhecidos; decisão de publicação.

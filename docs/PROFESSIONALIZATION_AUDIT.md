# Auditoria de profissionalização — Remédio na Hora

**Atualização:** 15/11/2026  
**Repositório:** `alexsantossp71-lgtm/remedios_app`  
**Commit de referência:** PR #42 mesclado em `1a3b959b1bfebfce638b426c6c94485bc9373919`; correções documentais e de política de backup em revisão no PR #43.

> **Status geral: EM HOMOLOGAÇÃO — AINDA NÃO DECLARAR PRONTO PARA USO PROFISSIONAL.**
>
> A avaliação separa evidências automatizadas de validações que exigem navegador/dispositivo, acesso operacional, revisão especializada ou ensaio de recuperação. CI verde não equivale a pentest, certificação, conformidade LGPD ou validação clínica.

## 1. Resumo executivo

O projeto possui uma base técnica consistente: React, TypeScript, ESLint, Vitest, build de produção, cofre local criptografado, backup com criptografia própria, migrações D1 versionadas, Worker, PWA e workflows de publicação.

Desde a auditoria inicial, houve progresso verificável:
- O workflow de publicação do Worker executa um job de validação e só inicia o deploy após `needs: validate`.
- Os workflows usam instalação congelada com pnpm.
- Há testes dedicados para o cofre, backup, lembretes, Push e Service Worker.
- O PR #42 ampliou os testes de lembretes/Push; o conjunto reportado no CI do PR foi de 237 testes Vitest e 6 testes do Service Worker.
- Após o merge do PR #42, os workflows de GitHub Pages e Cloudflare Worker concluíram com sucesso no commit `1a3b959`. O job do Worker também concluiu com sucesso a etapa de aplicação das migrações D1.

Essas evidências demonstram automação e publicação aprovadas naquele commit. Não demonstram entrega confiável de Push em todos os aparelhos, ausência de vulnerabilidades, recuperação operacional ensaiada ou segurança clínica universal.

## 2. Registro de achados e situação atual

### AUD-001 — Publicação do Worker sem bloqueio por validação
- **Gravidade original:** Alta.
- **Situação:** **Corrigido no workflow atual; requer manutenção.**
- **Evidência:** `.github/workflows/deploy-proxy.yml` possui o job `validate` com instalação congelada, lint, typecheck, testes, build e dry-run do Worker. O job `deploy` declara `needs: validate`.
- **Verificação:** execução `43657583338`, commit `1a3b959`: validação e publicação concluídas com sucesso.
- **Critério de manutenção:** qualquer alteração no workflow deve preservar a dependência; PRs com falha não podem executar migração remota nem publicar o Worker.

### AUD-002 — Cofre criptográfico sem testes dedicados
- **Gravidade original:** Alta.
- **Situação:** **Mitigado por testes automatizados; homologação multiaba ainda pendente.**
- **Evidência:** `src/services/secureStorage.test.ts` cobre senha mínima, migração sem perda, falha de IndexedDB, senha incorreta, adulteração AES-GCM, parâmetros incompatíveis, fila de gravação, falha de persistência, desativação segura e prevenção de sobrescrita do cofre.
- **Critério restante:** testar concorrência entre abas/contextos, interrupção abrupta do navegador e recuperação em navegadores reais. Não afirmar que o cofre protege contra malware, extensão maliciosa ou dispositivo já comprometido.

### AUD-003 — Ausência de homologação ponta a ponta em dispositivos
- **Gravidade:** Alta.
- **Situação:** **Aberto — bloqueia declaração de prontidão.**
- **Evidência:** Vitest roda em Node; o script `scripts/test-service-worker.mjs` exercita o Service Worker real em harness controlado, mas APIs de navegador são simuladas nos testes de serviço. Não há evidência de homologação em Android/Chrome, iOS/Safari e desktop.
- **Impacto:** permissões, suspensão do navegador, economia de bateria, atualização do PWA, reinstalação e conectividade variam por plataforma.
- **Critério de aceite:** matriz datada de dispositivos/navegadores, roteiro reproduzível e resultados de criar/editar/excluir lembretes, reiniciar, ficar offline/online, receber Push com app fechado, abrir notificação e revogar permissão.

### AUD-004 — Rate limit do Worker é local ao isolate
- **Gravidade:** Média, podendo tornar-se Alta conforme exposição e custo.
- **Situação:** **Aberto — decisão de arquitetura e operação.**
- **Evidência:** `worker/src/limiter.ts` declara que contadores são em memória, reiniciam e não são compartilhados entre isolates.
- **Impacto:** limites atuais são defesa de melhor esforço, não cota global persistente.
- **Critério de aceite:** documentar orçamento e abuso aceitável; escolher mecanismo distribuído (Cloudflare Rate Limiting, Durable Objects ou alternativa adequada); testar concorrência, reinício e comportamento quando o mecanismo estiver indisponível.

### AUD-005 — Instalação de dependências não reprodutível
- **Gravidade original:** Média.
- **Situação:** **Corrigido nos workflows observados.**
- **Evidência:** `.github/workflows/deploy.yml` e `.github/workflows/deploy-proxy.yml` executam `pnpm install --frozen-lockfile`; a validação do Worker também usa o lockfile do projeto.
- **Critério de manutenção:** não reintroduzir `--no-frozen-lockfile` ou instalação sem lockfile no CI; revisar dependências e alertas de vulnerabilidade periodicamente.

### AUD-006 — Estado da migração D1 e documentação
- **Gravidade original:** Média.
- **Situação:** **Migração versionada e aplicação pelo workflow confirmada; verificação independente do schema remoto ainda pendente.**
- **Evidência:** `worker/migrations/0001_push_schema.sql` versiona as tabelas e índices. A execução `43657583338` concluiu com sucesso a etapa “Aplicar migrações do banco D1” para o banco configurado como `remedios-push`.
- **Critério restante:** comparar o schema remoto com a migração, testar backup/restore e registrar retenção e responsável. Sucesso do comando de migração não substitui ensaio de restauração.

### AUD-007 — Política de senha diferente entre cofre e backup
- **Gravidade:** Baixa.
- **Situação:** **Correção proposta no PR #43.**
- **Evidência:** o cofre exige 10 caracteres; o backup criptografado aceitava 8.
- **Correção proposta:** exigir 10 caracteres na criação de novos backups. A rotina de descriptografia mantém a compatibilidade com arquivos antigos, sem elevar o limite mínimo dos arquivos já existentes.
- **Critério de aceite:** testes de limite 9/10 caracteres, teste de ida e volta com senha válida e preservação da abertura de backups legados.

### AUD-008 — Entrega Push sob concorrência e recuperação de falhas
- **Gravidade:** Média/Alta, pendente de avaliação.
- **Situação:** **Aberto — análise técnica necessária.**
- **Evidência:** `worker/src/push.ts` busca eventos vencidos em lotes e atualiza o estado após tentar o envio. Ainda não há evidência de ensaio de execuções Cron concorrentes, idempotência de ponta a ponta, backoff progressivo ou monitoramento de backlog.
- **Risco a investigar:** duplicidade ou atraso em condições de concorrência, indisponibilidade do provedor Push e acúmulo de eventos.
- **Critério de aceite:** estratégia documentada de claim/lease ou mecanismo equivalente, política de retentativa/backoff, métricas sem dados clínicos e testes concorrentes determinísticos.

## 3. Pendências de operação, privacidade e produto

| Área | Situação | Evidência necessária |
|---|---|---|
| D1 | Parcial | Comparação do schema remoto, backup e restauração ensaiada, retenção e limpeza |
| Rate limit | Aberto | Limites distribuídos, carga/concorrência, custo e alertas |
| Observabilidade | Aberto | Métricas de disponibilidade, latência, erros, backlog e consumo sem conteúdo clínico |
| Recuperação | Aberto | RPO/RTO aprovados, backup e restore testados, rollback exercitado |
| Push real | Aberto | Homologação em aparelhos e navegadores suportados |
| IA | Parcial | Casos sintéticos, timeout/fallback, validação de schema e revisão humana; não é validação clínica |
| Privacidade/LGPD | Aberto | Definição de controlador/operadores, bases legais, retenção, direitos, fornecedores e revisão jurídica |
| Acessibilidade | Aberto | Teclado, leitor de tela, contraste, foco, zoom/reflow e inspeção manual |
| Segurança independente | Aberto | Revisão de código/pentest por profissional independente antes de uso institucional/comercial |

## 4. Critérios bloqueadores para prontidão profissional

### Engenharia e release
- [ ] Lint, typecheck, testes e build aprovados no commit candidato.
- [ ] Instalação reproduzível com lockfile congelado.
- [ ] Deploy do Worker condicionado à validação.
- [ ] Diff revisado e PR aprovada; nenhuma alteração não revisada diretamente na `main`.
- [ ] Rollback do frontend e Worker ensaiado; compatibilidade de migrações documentada.

### Dados e recuperação
- [ ] Testes do cofre e backup aprovados, incluindo falhas e compatibilidade.
- [ ] Backup protegido identificado e restauração testada.
- [ ] RPO/RTO definidos e aprovados.
- [ ] Política de retenção e exclusão aplicada aos dados locais e remotos.
- [ ] Backup/restore D1 ensaiado com acesso restrito.

### Lembretes e IA
- [ ] Fluxos críticos homologados em plataformas suportadas.
- [ ] Push real testado com app fechado; limitações comunicadas sem prometer entrega garantida.
- [ ] Falhas, duplicidade, retentativa e backlog de notificações testados.
- [ ] IA testada com entradas sintéticas, respostas inválidas, timeout e fallback.
- [ ] Otimização de horários não altera dose, frequência ou duração prescrita e exige revisão humana.

### Privacidade, segurança e acessibilidade
- [ ] Inventário de dados e fornecedores atualizado.
- [ ] Consentimentos claros, específicos e revogáveis nos fluxos aplicáveis.
- [ ] Revisão jurídica especializada de LGPD e textos legais concluída.
- [ ] Revisão independente de segurança concluída.
- [ ] Alertas operacionais e plano de incidentes testados.
- [ ] Fluxos principais aprovados em teclado, leitor de tela, contraste e layout móvel.

## 5. Evidências de CI e publicação

- PR #42: testes de lembretes/Push ampliados; 237 testes Vitest e 6 testes do Service Worker reportados no CI do PR.
- Workflow `43657583338`: validação do projeto, aplicação de migrações D1, deploy do Worker e publicação de secrets concluídos com sucesso.
- Workflow `43657583353`: build e publicação do GitHub Pages concluídos com sucesso.
- Commit publicado: `1a3b959b1bfebfce638b426c6c94485bc9373919`.

## 6. Limites e governança

- Nenhum teste automatizado comprova ausência de defeitos ou segurança clínica universal.
- Não foram usados dados reais de saúde nesta auditoria.
- Não foi feita certificação, pentest independente, parecer jurídico ou validação clínica.
- Não afirmar conformidade LGPD sem avaliação jurídica e operacional.
- Não alterar dose, frequência ou duração de medicamentos por automação ou IA.
- Cada achado só deve ser encerrado com evidência verificável; correção em código sem teste ou homologação não basta.
- Manter este documento atualizado em cada PR e registrar commit, execução CI, evidência, pendências e responsável.

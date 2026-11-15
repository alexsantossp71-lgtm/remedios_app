# Auditoria de profissionalização — Remédio na Hora

**Atualização:** 15/11/2026  
**Repositório:** `alexsantossp71-lgtm/remedios_app`  
**Commit de referência:** PR #42 mesclado em `1a3b959b1bfebfce638b426c6c94485bc9373919`; correções de backup e auditoria no PR #43; confiabilidade Push no PR #44; rate limit persistente no PR #45; rollback do cofre no PR #46.

> **Status geral: EM HOMOLOGAÇÃO — AINDA NÃO DECLARAR PRONTO PARA USO PROFISSIONAL.**
>
> A avaliação separa evidências automatizadas de validações que exigem navegador/dispositivo, acesso operacional, revisão especializada ou ensaio de recuperação. CI verde não equivale a pentest, certificação, conformidade LGPD ou validação clínica.

## 1. Resumo executivo

O projeto possui uma base técnica consistente: React, TypeScript, ESLint, Vitest, build de produção, cofre local criptografado, backup com criptografia própria, migrações D1 versionadas, Worker, PWA e workflows de publicação.

Desde a auditoria inicial, houve progresso verificável:
- O workflow de publicação do Worker executa um job de validação e só inicia o deploy após `needs: validate`.
- Os workflows usam instalação congelada com pnpm.
- Há testes dedicados para o cofre, backup, lembretes, Push e Service Worker.
- PRs #43 a #46 estão abertos com CI aprovado; nenhum deles foi mesclado até esta atualização.
- PR #44 propõe claims/leases, timeout e backoff para Push; CI e aplicação local das migrações 0001/0002 passaram.
- PR #45 propõe rate limits D1 compartilhados entre isolates e falha fechada; CI e aplicação local das migrações versionadas passaram.
- PR #46 corrige rollback da desativação do cofre, com testes para falha parcial de localStorage e IndexedDB.
- PR #47 propõe CodeQL v4 e Dependabot; Dependency Review foi adiado porque o Dependency Graph está desabilitado no GitHub.
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
- **Situação:** **Testes automatizados existentes; rollback de desativação reforçado no PR #46 (CI aprovado, aguardando merge).**
- **Evidência:** `src/services/secureStorage.test.ts` cobre senha mínima, migração sem perda, falha de IndexedDB, senha incorreta, adulteração AES-GCM, parâmetros incompatíveis, fila de gravação, falha de persistência, desativação segura e prevenção de sobrescrita do cofre.
- **Critério restante:** após merge do PR #46, testar concorrência entre abas/contextos, interrupção abrupta do navegador e recuperação em navegadores reais. Não afirmar que o cofre protege contra malware, extensão maliciosa ou dispositivo já comprometido.

### AUD-003 — Ausência de homologação ponta a ponta em dispositivos
- **Gravidade:** Alta.
- **Situação:** **Aberto — bloqueia declaração de prontidão.**
- **Evidência:** Vitest roda em Node; o script `scripts/test-service-worker.mjs` exercita o Service Worker real em harness controlado, mas APIs de navegador são simuladas nos testes de serviço. Não há evidência de homologação em Android/Chrome, iOS/Safari e desktop.
- **Impacto:** permissões, suspensão do navegador, economia de bateria, atualização do PWA, reinstalação e conectividade variam por plataforma.
- **Critério de aceite:** matriz datada de dispositivos/navegadores, roteiro reproduzível e resultados de criar/editar/excluir lembretes, reiniciar, ficar offline/online, receber Push com app fechado, abrir notificação e revogar permissão.

### AUD-004 — Rate limit do Worker é local ao isolate
- **Gravidade:** Média, podendo tornar-se Alta conforme exposição e custo.
- **Situação:** **Correção proposta no PR #45; CI aprovado, aguardando merge e aplicação da migração 0003 no D1 remoto.**
- **Evidência:** `worker/src/limiter.ts` declara que contadores são em memória, reiniciam e não são compartilhados entre isolates.
- **Impacto:** limites atuais são defesa de melhor esforço, não cota global persistente.
- **Evidência da correção proposta:** contadores atômicos no D1 por janela/IP/dia/global, escopo separado para diagnóstico, hash SHA-256 do IP e limpeza por Cron; testes simulam isolates compartilhando banco.
- **Critério restante:** mesclar, aplicar migração remota, verificar custo/retensão e testar operação no ambiente Cloudflare.

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
- **Situação:** **Correção proposta no PR #43; CI aprovado, aguardando merge.**
- **Evidência:** o cofre exige 10 caracteres; o backup criptografado aceitava 8.
- **Correção proposta:** exigir 10 caracteres na criação de novos backups. A rotina de descriptografia mantém a compatibilidade com arquivos antigos, sem elevar o limite mínimo dos arquivos já existentes.
- **Critério de aceite:** testes de limite 9/10 caracteres, teste de ida e volta com senha válida e preservação da abertura de backups legados.

### AUD-008 — Entrega Push sob concorrência e recuperação de falhas
- **Gravidade:** Média/Alta, pendente de avaliação.
- **Situação:** **Correção proposta no PR #44; CI aprovado, aguardando merge e aplicação da migração 0002 no D1 remoto.**
- **Evidência:** `worker/src/push.ts` busca eventos vencidos em lotes e atualiza o estado após tentar o envio. Ainda não há evidência de ensaio de execuções Cron concorrentes, idempotência de ponta a ponta, backoff progressivo ou monitoramento de backlog.
- **Risco a investigar:** duplicidade ou atraso em condições de concorrência, indisponibilidade do provedor Push e acúmulo de eventos.
- **Evidência da correção proposta:** claim atômico com lease, timeout de 10 s, backoff de 1 min/5 min/15 min/1 h, limite de 5 tentativas e testes concorrentes determinísticos.
- **Critério restante:** mesclar, aplicar migração remota e validar entrega em dispositivos reais; a garantia continua sendo de melhor esforço, não exatamente uma vez.


### AUD-009 — Desativação do cofre pode deixar cópias locais parciais
- **Gravidade:** Alta.
- **Situação:** **Correção proposta no PR #46; CI aprovado, aguardando merge.**
- **Evidência:** a desativação grava os registros em localStorage antes de excluir o envelope criptografado. Se uma gravação intermediária ou a abertura/remoção do IndexedDB falhar, cópias em texto puro poderiam permanecer parcialmente gravadas.
- **Correção proposta:** capturar snapshot local, reverter gravações parciais em falha e limpar a chave/dados em memória somente após confirmação da remoção do envelope.
- **Critério restante:** mesclar e validar em navegador real, inclusive falha de cota e IndexedDB indisponível. Se o rollback também falhar, o usuário deve preservar o dispositivo para recuperação.


### AUD-010 — Análise estática e grafo de dependências não habilitados
- **Gravidade:** Média.
- **Situação:** **CodeQL executado com sucesso no PR #47; Dependabot proposto; aguardando merge. Dependency Review bloqueado por configuração do repositório.**
- **Evidência:** o repositório ainda não tinha workflow CodeQL nem configuração Dependabot. Ao testar Dependency Review, o GitHub respondeu que o Dependency Graph está desabilitado.
- **Evidência:** CodeQL v4 executou com sucesso no PR #47 e enviou os resultados ao Code Scanning. O workflow usa consultas `security-extended` em PRs, pushes na `main` e agenda semanal; Dependabot semanal foi configurado para dependências e GitHub Actions.
- **Critério restante:** mesclar e revisar os alertas no painel Code Scanning; habilitar Dependency Graph em Settings → Security & analysis antes de ativar Dependency Review. Dependabot não substitui revisão de atualizações nem testes.

## 3. Pendências de operação, privacidade e produto

| Área | Situação | Evidência necessária |
|---|---|---|
| D1 | Parcial; PRs #44/#45 aguardando merge | Comparação do schema remoto, migrações 0002/0003, backup/restore ensaiado e retenção |
| Rate limit | PR #45 com CI aprovado; pendente de merge/deploy | Verificar custo, retenção, concorrência e comportamento em produção |
| Observabilidade | Aberto | Métricas de disponibilidade, latência, erros, backlog e consumo sem conteúdo clínico |
| Recuperação | Parcial; PR #46 corrige rollback local do cofre | RPO/RTO aprovados, backup/restore D1 e rollback de release exercitados |
| Push real | Aberto | Homologação em aparelhos e navegadores suportados |
| IA | Parcial | Casos sintéticos, timeout/fallback, validação de schema e revisão humana; não é validação clínica |
| Privacidade/LGPD | Aberto | Definição de controlador/operadores, bases legais, retenção, direitos, fornecedores e revisão jurídica |
| Acessibilidade | Aberto | Teclado, leitor de tela, contraste, foco, zoom/reflow e inspeção manual |
| Segurança independente | Aberto | Revisão de código/pentest por profissional independente antes de uso institucional/comercial |
| Análise contínua | PR #47 proposto; Dependency Graph desabilitado | CodeQL sem alertas, Dependabot ativo e Dependency Review após habilitar o grafo |

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
- PR #43: senha mínima de backup e auditoria atualizada; lint, typecheck, testes, build e validação do Worker aprovados.
- PR #44: confiabilidade de entrega Push; lint, typecheck, testes, build, dry-run e migrações D1 locais aprovados.
- PR #45: rate limit persistente; lint, typecheck, testes, build, dry-run e migrações D1 locais aprovados.
- PR #46: rollback da desativação do cofre; lint, typecheck, testes e build aprovados.
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

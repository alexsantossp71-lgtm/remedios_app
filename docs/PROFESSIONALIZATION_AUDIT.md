# Auditoria de profissionalização — Remédio na Hora

**Data de referência:** 14/11/2026  
**Repositório:** `alexsantossp71-lgtm/remedios_app`  
**Branch da auditoria:** `audit/professionalization-baseline`  
**Commit-base:** `c52df6ddd41359abde19356a23f224c83e5f68d3`  
**Escopo desta rodada:** inspeção estática do repositório, documentação, workflows e evidências recentes do GitHub Actions.

> **Status geral: EM AUDITORIA — NÃO DECLARAR PRONTO PARA USO PROFISSIONAL AINDA.**
>
> Esta é uma avaliação inicial baseada no código e nas evidências disponíveis no GitHub. Não equivale a pentest, auditoria independente, avaliação jurídica/LGPD, validação clínica, nem homologação em dispositivos ou no ambiente Cloudflare de produção. Itens sem evidência são marcados como pendentes, não como defeitos comprovados.

## 1. Resumo executivo

O projeto já tem uma base de engenharia relevante: TypeScript, React, Vitest, ESLint, build de produção, testes distribuídos por regras de negócio e serviços, migração SQL versionada do D1 e pipelines de publicação.

A execução mais recente do workflow **Deploy to GitHub Pages**, no commit-base desta auditoria, terminou com sucesso. Os jobs `build` e `deploy` foram concluídos; o job de build executou instalação, lint, typecheck, testes Vitest, build do frontend e dry-run do Worker. Isso comprova a aprovação daquela execução automatizada, mas não comprova funcionamento em dispositivos reais ou segurança clínica.

### Evidências positivas confirmadas

- `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` são etapas do workflow de publicação.
- O Worker passa por validação de deploy em modo dry-run no workflow do Pages.
- Existem testes unitários em serviços e utilitários, incluindo backup, configurações, IA, adesão, datas, prescrições, doses perdidas e aconselhamento de horários.
- Há uma migração versionada em `worker/migrations/0001_push_schema.sql`, com tabelas, índices e chave estrangeira para o fluxo de Push.
- O cofre local usa PBKDF2-SHA-256 (310.000 iterações) e AES-GCM-256, com envelope armazenado no IndexedDB.
- O backup possui formato identificado por aplicação/versão e implementação de criptografia própria.

### Limites da evidência

- CI verde é evidência de qualidade automatizada naquele commit, não de ausência de defeitos.
- O ambiente de execução dos testes Vitest está configurado como Node; não é uma suíte de navegador.
- Não foi apresentada evidência de testes ponta a ponta em Android/iOS/desktop, nem de ensaios de entrega de Push em condições reais.
- O estado remoto do Cloudflare D1, secrets, retenção, alertas e backups não pode ser confirmado apenas pelo repositório.
- Não foi realizada revisão clínica ou jurídica.

## 2. Classificação de gravidade

| Nível | Significado | Regra de tratamento |
|---|---|---|
| **Crítica** | Risco imediato demonstrado de perda/exposição de dados ou comportamento clínico perigoso | Bloqueia release; correção e revalidação obrigatórias |
| **Alta** | Falta de controle importante em fluxo sensível ou publicação | Bloqueia declaração de prontidão profissional até mitigação |
| **Média** | Lacuna de confiabilidade, rastreabilidade ou manutenção | Deve ter responsável, prazo e critério de aceite |
| **Baixa** | Melhoria de acabamento ou processo | Planejar sem bloquear, salvo impacto adicional |

**Nesta rodada:** nenhum defeito crítico foi confirmado. Há lacunas altas e médias que precisam de validação/correção. A ausência de evidência não deve ser interpretada como aprovação.

## 3. Registro inicial de achados

### AUD-001 — Deploy do Worker não está condicionado ao resultado do pipeline de qualidade

- **Gravidade:** Alta
- **Categoria:** CI/CD e operação
- **Evidência:** `.github/workflows/deploy-proxy.yml` é acionado por push na `main` quando arquivos `worker/**` ou o próprio workflow mudam. Esse workflow executa migrações remotas e deploy. A validação de lint, typecheck, testes e build está em outro workflow (`.github/workflows/deploy.yml`); não há dependência `needs` entre os workflows.
- **Impacto potencial:** uma alteração do Worker pode iniciar o deploy mesmo que a execução independente de qualidade falhe.
- **Correção proposta:** unificar o fluxo ou criar uma condição explícita de publicação após os checks obrigatórios aprovados; separar validação de migração e aplicação remota; manter aprovação manual para operações destrutivas ou de impacto no banco.
- **Critério de aceite:** um teste de PR com falha em lint/teste/typecheck não pode publicar Worker nem aplicar migração remota; um push aprovado pode publicar e registrar o commit implantado.
- **Status:** Aberto.

### AUD-002 — Cofre criptográfico sem suíte de testes dedicada identificada

- **Gravidade:** Alta
- **Categoria:** Proteção de dados
- **Evidência:** existe implementação em `src/services/secureStorage.tsx`, mas não foi encontrado arquivo `secureStorage.test.*` na listagem de testes do projeto. A implementação faz migração de dados legados, gravação no IndexedDB, desbloqueio, bloqueio e fila de gravações.
- **Impacto potencial:** regressões na migração, desbloqueio, concorrência ou persistência podem causar perda de acesso ou inconsistência em dados sensíveis.
- **Correção proposta:** criar testes unitários e de integração para senha incorreta, envelope adulterado/incompatível, falha de IndexedDB, interrupção de gravação, migração sem perda, múltiplas abas, bloqueio e restauração.
- **Critério de aceite:** todos os cenários críticos automatizados passam; a migração nunca remove a cópia de origem antes da confirmação da cópia protegida; falhas de gravação são detectáveis e recuperáveis.
- **Status:** Aberto.

### AUD-003 — Fluxos essenciais ainda sem evidência de homologação ponta a ponta em dispositivos

- **Gravidade:** Alta
- **Categoria:** Lembretes, Push e experiência de uso
- **Evidência:** `vite.config.ts` configura Vitest com ambiente `node`; a listagem contém testes unitários, mas não foi identificada suíte de navegador/E2E. A documentação também exige testes reais de navegador e dispositivo.
- **Impacto potencial:** diferenças de permissões, suspensão do navegador, economia de bateria, reinstalação, atualização do Service Worker e conectividade podem não aparecer nos testes unitários.
- **Correção proposta:** instituir matriz de homologação para Android/Chrome, iOS/Safari e desktop; testar agendamento, cancelamento, duplicidade, reinício, offline/retorno da rede, permissões e atualização do PWA.
- **Critério de aceite:** roteiro reproduzível, evidências datadas por plataforma e nenhum defeito bloqueador nos fluxos críticos; a interface deve informar que Push depende das permissões e condições do sistema e não é garantia absoluta de entrega.
- **Status:** Aberto.

### AUD-004 — Limitação conhecida do rate limit em memória

- **Gravidade:** Média
- **Categoria:** Worker e operação
- **Evidência:** `worker/src/limiter.ts` declara explicitamente que os contadores são locais ao isolate, reiniciam e não são compartilhados entre isolates.
- **Impacto potencial:** os limites atuais são de melhor esforço e não representam uma cota global persistente para o proxy público.
- **Correção proposta:** decidir o nível de exposição e custo aceitável; se forem necessárias cotas rígidas, avaliar Cloudflare Rate Limiting ou Durable Objects, com limites e alertas operacionais.
- **Critério de aceite:** requisito de cota documentado e teste de carga/concorrência demonstrando o comportamento esperado; limites e custos monitoráveis.
- **Status:** Aberto — decisão de arquitetura necessária.

### AUD-005 — Instalação de dependências não é estritamente reprodutível nos workflows

- **Gravidade:** Média
- **Categoria:** Supply chain e CI
- **Evidência:** o workflow principal usa `pnpm install --no-frozen-lockfile`; o workflow do Worker usa `npm install`. O repositório possui `pnpm-lock.yaml`, mas não foi identificada trava de dependências própria do Worker na pasta `worker`.
- **Impacto potencial:** uma execução futura pode resolver versões diferentes das usadas em uma execução anterior.
- **Correção proposta:** usar instalação congelada para o frontend; definir e versionar lockfile do Worker ou padronizar a instalação com uma estratégia reproduzível.
- **Critério de aceite:** CI instala sem modificar lockfiles; duas execuções limpas sobre o mesmo commit resolvem a mesma árvore de dependências.
- **Status:** Aberto.

### AUD-006 — Documentação do D1 estava desatualizada

- **Gravidade:** Média
- **Categoria:** Documentação e operação
- **Evidência:** `docs/D1_SCHEMA.md` dizia que não havia migração SQL versionada, mas existe `worker/migrations/0001_push_schema.sql` com as duas tabelas, índices e foreign key.
- **Impacto potencial:** instruções operacionais incompletas e divergência entre documentação e código.
- **Correção aplicada nesta branch:** atualizar `docs/D1_SCHEMA.md` para descrever a migração encontrada e distinguir o schema versionado do estado efetivamente aplicado no D1 remoto.
- **Critério de aceite:** documentação corresponde à migração versionada; operador confirma que as migrações foram aplicadas no banco correto.
- **Status:** Correção documental proposta nesta branch; confirmação remota pendente.

### AUD-007 — Política de senha do cofre e do backup criptografado difere

- **Gravidade:** Baixa
- **Categoria:** Segurança e experiência
- **Evidência:** `src/services/secureStorage.tsx` exige pelo menos 10 caracteres; `src/services/backup.ts` exige pelo menos 8 para o backup criptografado.
- **Impacto potencial:** regras diferentes podem confundir o usuário e dificultar uma política consistente de orientação.
- **Correção proposta:** decidir uma política comum ou documentar claramente por que os requisitos diferem; avaliar força da senha, usabilidade e compatibilidade antes de alterar arquivos existentes.
- **Critério de aceite:** regra aprovada, mensagens coerentes e testes para limites mínimos e máximos.
- **Status:** Aberto.

## 4. Plano de execução

| Fase | Entrega | Prioridade | Condição para encerrar |
|---|---|---|---|
| 0 — Baseline | Este relatório, registro de achados e correção documental D1 | Imediata | Relatório versionado e revisável |
| 1 — Pipeline | Bloqueio de deploy do Worker por checks; instalação reproduzível | Alta | Falhas de CI impedem publicação |
| 2 — Dados | Testes do cofre, backup, importação e restauração | Alta | Casos críticos automatizados aprovados |
| 3 — Lembretes | Homologação E2E de lembretes, Push e PWA em dispositivos | Alta | Matriz de plataformas preenchida |
| 4 — Operação | Rate limit adequado, observabilidade, alertas, retenção e rollback | Média/Alta | Evidências de operação e recuperação |
| 5 — Privacidade | Inventário de dados, consentimentos, exclusão e revisão LGPD | Alta | Revisão especializada e documentos aprovados |
| 6 — Release | Homologação completa e relatório final | Bloqueante | Todos os critérios obrigatórios aprovados |

## 5. Critérios objetivos para declarar prontidão profissional

A declaração de prontidão só poderá ocorrer quando todos os itens bloqueadores abaixo tiverem evidência registrada.

### Engenharia e publicação
- [ ] Lint, typecheck, testes e build aprovados no commit candidato.
- [ ] Instalação reproduzível sem alteração de lockfile.
- [ ] Deploy do Worker condicionado aos checks de qualidade.
- [ ] PR revisada, diff inspecionado e rollback documentado.
- [ ] Migrações D1 testadas em ambiente não produtivo antes de produção.

### Dados e recuperação
- [ ] Testes dedicados do cofre aprovados.
- [ ] Testes de exportação, criptografia, importação e restauração aprovados.
- [ ] Backup de dados sensíveis claramente identificado e protegido.
- [ ] RPO/RTO definidos e restauração ensaiada.
- [ ] Exclusão e retenção de dados documentadas.

### Lembretes e IA
- [ ] Fluxos de lembrete homologados nas plataformas suportadas.
- [ ] Permissões, falhas de entrega e limitações de Push comunicadas.
- [ ] IA testada com casos sintéticos, entradas inválidas, timeout e fallback.
- [ ] Nenhuma operação de IA modifica dose, frequência ou duração prescrita.
- [ ] Mensagens de incerteza e necessidade de confirmação profissional aparecem nos fluxos pertinentes.

### Privacidade e operação
- [ ] Mapa de dados e fornecedores atualizado.
- [ ] Consentimentos de envio a provedores externos claros, específicos e revogáveis.
- [ ] Revisão especializada de privacidade/LGPD concluída.
- [ ] Monitoramento e alertas operacionais testados.
- [ ] Plano de incidentes e rollback exercitado.

### Acessibilidade e experiência
- [ ] Fluxos principais utilizáveis por teclado e leitor de tela.
- [ ] Contraste, foco, rótulos e mensagens de erro revisados.
- [ ] Layout validado em celular, tablet e desktop.
- [ ] Estados de carregamento, erro, vazio e sucesso verificados.

## 6. Evidências consultadas

- `package.json`: scripts de lint, typecheck, teste e build.
- `.github/workflows/deploy.yml`: pipeline de qualidade e publicação Pages.
- `.github/workflows/deploy-proxy.yml`: fluxo independente de deploy do Worker e aplicação de migrações remotas.
- `vite.config.ts`: escopo e ambiente dos testes Vitest.
- `src/services/secureStorage.tsx`: implementação do cofre local.
- `src/services/backup.ts`: formato e criptografia do backup.
- `worker/src/limiter.ts`: escopo local dos contadores de rate limit.
- `worker/migrations/0001_push_schema.sql`: schema versionado do D1.
- GitHub Actions: execução `43611900482`, commit `c52df6d`, concluída com sucesso em 14/11/2026; jobs `build` e `deploy` aprovados.

## 7. Fora do escopo desta rodada

- Não foram realizadas chamadas com dados reais de saúde.
- Não foram alterados medicamentos, doses, frequências ou prescrições.
- Não foi feita alteração de infraestrutura ou deploy no Cloudflare.
- Não foi feita auditoria jurídica, certificação de segurança ou validação clínica.
- Não foi confirmado o estado real dos recursos e secrets no painel Cloudflare.
- Nenhuma alteração funcional foi integrada à `main`.

## 8. Governança desta auditoria

- Cada achado deve receber identificador estável, gravidade, evidência, responsável, correção, critério de aceite e status.
- Correções devem ocorrer em branches separadas e entrar por PR.
- Não fechar achado apenas porque o código foi alterado: exigir teste e evidência.
- Reabrir o achado se a regressão reaparecer.
- Atualizar este relatório após cada fase e emitir uma conclusão final apenas depois da homologação.

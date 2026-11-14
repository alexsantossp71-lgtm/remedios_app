# Documentação técnica — Remédio na Hora

**Projeto:** Remédio na Hora (`remedios_app`)  
**Versão documental:** 1.2  
**Data:** 14/11/2026  
**Base de inspeção:** branch `main`, consultada durante a elaboração desta documentação.  
**Status:** documentação técnica ampliada; itens não verificados estão identificados como pendências.

Esta pasta é a referência técnica do aplicativo. Os documentos descrevem o comportamento observado no código e distinguem controles implementados, recomendações e pontos ainda não auditados.

## 1. Visão geral e desenvolvimento

| Documento | Conteúdo |
|---|---|
| [Arquitetura](./ARCHITECTURE.md) | Componentes, camadas e integrações |
| [Stack tecnológica](./TECH_STACK.md) | Linguagens, bibliotecas e ferramentas |
| [Instalação e desenvolvimento](./DEVELOPMENT.md) | Pré-requisitos, scripts e fluxo local |
| [Modelo de domínio](./DOMAIN_MODEL.md) | Entidades, campos e relacionamentos |
| [Inventário de dados](./DATA_INVENTORY.md) | Categorias, locais de processamento e privacidade |
| [Fluxos de dados](./DATA_FLOWS.md) | Como os dados circulam entre app e fornecedores |
| [Referência da API](./API_REFERENCE.md) | Rotas, métodos, payloads e respostas |

## 2. Dados e segurança

| Documento | Conteúdo |
|---|---|
| [Dados e armazenamento](./DATA_STORAGE.md) | Persistência local e validação |
| [Cofre protegido](./SECURE_STORAGE.md) | PBKDF2, AES-GCM, IndexedDB e ciclo de vida |
| [Backup e recuperação](./BACKUP_RECOVERY.md) | Exportação, restauração e recuperação |
| [Contrato de backup](./BACKUP_FORMAT.md) | Requisitos de versionamento, importação e testes |
| [Segurança](./SECURITY.md) | Controles, privacidade e requisitos |
| [Segurança da IA](./AI_SAFETY.md) | Limites clínicos, validação e riscos das respostas |
| [Modelo de ameaças](./THREAT_MODEL.md) | Ativos, ameaças e mitigação |
| [Tratamento de erros](./ERROR_HANDLING.md) | Falhas e comportamento de recuperação |

## 3. IA, notificações e PWA

| Documento | Conteúdo |
|---|---|
| [Integração com IA](./AI_INTEGRATION.md) | NVIDIA, Pollinations, modelos e limites |
| [Notificações Push](./PUSH_NOTIFICATIONS.md) | Inscrição, agendamento, D1 e envio |
| [Esquema D1](./D1_SCHEMA.md) | Contrato observado das tabelas de notificações |
| [PWA e modo offline](./PWA_OFFLINE.md) | Manifesto, Service Worker e cache |
| [Configuração](./CONFIGURATION.md) | Variáveis, secrets e limites |

## 4. Qualidade e operação

| Documento | Conteúdo |
|---|---|
| [Deploy e infraestrutura](./DEPLOYMENT.md) | GitHub Pages, Cloudflare e pipelines |
| [Testes e qualidade](./TESTING.md) | Ferramentas, cobertura e critérios |
| [Runbook operacional](./OPERATIONS_RUNBOOK.md) | Publicação, diagnóstico e rollback |
| [Resposta a incidentes](./INCIDENT_RESPONSE.md) | Contenção, avaliação e recuperação |
| [Checklist de release](./RELEASE_CHECKLIST.md) | Critérios de aceite e publicação |
| [Compatibilidade](./COMPATIBILITY.md) | APIs de navegador e matriz de testes |
| [Acessibilidade](./ACCESSIBILITY.md) | Critérios e testes recomendados |
| [Controle de mudanças](./CHANGE_CONTROL.md) | Branches, PRs e atualização documental |

## 5. Manutenção da documentação

- Atualizar os documentos na mesma alteração que modificar arquitetura, contratos, dados ou infraestrutura.
- Não registrar segredos, tokens, chaves privadas, dados reais de usuários ou backups.
- Diferenciar comportamento implementado, planejado e não validado.
- Registrar data e escopo da auditoria quando forem confirmados novos controles.
- Não afirmar conformidade legal, segurança certificada, disponibilidade ou precisão clínica sem evidências e validação apropriadas.

## 6. Pendências de engenharia identificadas

1. Confirmar o DDL e as migrações reais do Cloudflare D1; ver [Esquema D1](./D1_SCHEMA.md), que descreve o contrato observado sem inventar o DDL.
2. Auditar integralmente o módulo de cofre, incluindo custo PBKDF2, concorrência entre abas e recuperação após falhas.
3. Auditar a implementação real de exportação/importação e alinhar o formato executado ao contrato proposto em [Contrato de backup](./BACKUP_FORMAT.md).
4. Avaliar limites globais persistentes para o proxy; o rate limit atual é em memória por isolate.
5. Definir RPO/RTO, retenção, monitoramento e rollback testado.
6. Realizar auditoria de segurança, acessibilidade e privacidade independente antes de uso institucional/comercial.

## 7. Escopo e ressalvas

A documentação foi elaborada a partir de arquivos do repositório, incluindo `package.json`, `src/App.tsx`, `src/types.ts`, `src/storage.ts`, serviços de IA e Push, `worker/src`, `worker/wrangler.toml`, Service Worker, manifesto e workflows. Ela não substitui auditoria de segurança, validação clínica, avaliação jurídica ou testes em produção.

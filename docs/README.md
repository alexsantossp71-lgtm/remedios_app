# Documentação técnica — Remédio na Hora

**Projeto:** Remédio na Hora (repositório `remedios_app`)  
**Versão documental:** 1.0  
**Data:** 14/11/2026  
**Status:** documentação inicial baseada na inspeção do código da branch `main`.

Esta pasta reúne a documentação técnica do aplicativo. Os documentos descrevem o comportamento observado no repositório; itens ainda não verificados estão identificados como pendências, e não como funcionalidades garantidas.

## Índice

| Documento | Conteúdo |
|---|---|
| [Arquitetura](./ARCHITECTURE.md) | Componentes, camadas e integrações |
| [Stack tecnológica](./TECH_STACK.md) | Linguagens, bibliotecas e ferramentas |
| [Instalação e desenvolvimento](./DEVELOPMENT.md) | Pré-requisitos e execução local |
| [Dados e armazenamento](./DATA_STORAGE.md) | Entidades, persistência e backup |
| [Integração com IA](./AI_INTEGRATION.md) | Proxy, provedores, fluxo e limites |
| [Deploy e infraestrutura](./DEPLOYMENT.md) | GitHub Pages, Cloudflare e pipelines |
| [Testes e qualidade](./TESTING.md) | Scripts e validações automatizadas |
| [Segurança](./SECURITY.md) | Controles observados e recomendações |

## Como manter esta documentação

- Atualize os documentos na mesma alteração que modificar arquitetura, contratos, dados ou infraestrutura.
- Não registre segredos, tokens, chaves privadas, dados reais de usuários ou exemplos com informações pessoais.
- Diferencie comportamento implementado, comportamento planejado e comportamento ainda não validado.
- Ao alterar fluxos de dados de saúde, revise também `DATA_STORAGE.md` e `SECURITY.md`.
- Ao alterar provedores, proxy ou modelos, revise `AI_INTEGRATION.md`.

## Escopo e ressalvas

Esta é a primeira versão da documentação técnica. Ela foi elaborada a partir de arquivos do repositório, incluindo `README.md`, `package.json`, `src/App.tsx`, `src/types.ts`, `src/storage.ts`, serviços de IA e notificações, service worker e workflows do GitHub Actions. Não substitui auditoria de segurança, validação clínica, avaliação jurídica ou testes em produção.

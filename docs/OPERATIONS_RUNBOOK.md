# Runbook operacional

Este runbook descreve verificações práticas para publicação e diagnóstico. Os passos que dependem de acesso a contas Cloudflare/GitHub devem ser executados por operador autorizado.

## 1. Antes de publicar o frontend

- Confirmar branch e commit alvo.
- Executar `pnpm install --frozen-lockfile`.
- Executar `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build`.
- Revisar alterações em tipos e armazenamento.
- Confirmar que nenhum secret ou dado pessoal foi incluído.
- Conferir caminho base `/remedios_app/`.

## 2. Publicação frontend

O workflow `.github/workflows/deploy.yml` publica o build em GitHub Pages após push para `main`. Após sucesso:
1. abrir a URL pública;
2. confirmar carregamento de CSS/JS e ícones;
3. verificar console do navegador;
4. validar persistência e navegação;
5. validar PWA e notificações conforme navegador;
6. testar uma operação de IA com dados fictícios.

## 3. Publicação do Worker

O workflow `.github/workflows/deploy-proxy.yml` publica o Worker quando os caminhos configurados são alterados ou por execução manual.

Antes do deploy:
- confirmar secrets Cloudflare e provedor no ambiente apropriado;
- validar `worker/wrangler.toml`;
- revisar migrações D1 existentes;
- verificar allowlist de origem e modelos;
- executar testes do Worker.

Depois do deploy:
- consultar `GET /health`;
- consultar `GET /v1/models` com origem autorizada;
- validar uma chamada sintética de IA;
- validar Push em dispositivo de teste sem dados reais.

## 4. Diagnóstico de indisponibilidade de IA

1. Confirmar conexão do navegador.
2. Consultar `/health`.
3. Consultar catálogo `/v1/models`.
4. Verificar status HTTP e `Retry-After`.
5. Conferir se modelo está em `ALLOWED_MODELS`.
6. Verificar secret NVIDIA no painel Cloudflare, sem copiar seu valor para logs.
7. Verificar status/limites do provedor.
8. Reproduzir com prompt fictício e dados não pessoais.

Não aumentar allowlist, limites ou custos automaticamente sem avaliar impacto.

## 5. Diagnóstico de Push

1. Verificar permissão do navegador.
2. Verificar Service Worker ativo e inscrição Push.
3. Verificar se o token local existe sem exibi-lo.
4. Verificar respostas de `/push/register` e `/push/schedule`.
5. Verificar binding D1 e chaves VAPID.
6. Verificar Cron Trigger e eventos pendentes.
7. Testar em navegador/dispositivo compatível.

Não colocar endpoint completo de inscrição, chaves ou tokens em issue pública.

## 6. Incidente de segurança

- Restringir acesso e preservar evidências.
- Revogar/rotacionar credenciais suspeitas.
- Identificar dados, sistemas e titulares potencialmente afetados.
- Envolver responsável por privacidade/jurídico.
- Seguir procedimento de comunicação aplicável.
- Registrar linha do tempo, decisões e correções.
- Não apagar evidências antes da análise.

## 7. Rollback

Não há procedimento automatizado de rollback formal documentado. Para reversão:
- identificar último commit frontend estável;
- identificar versão anterior do Worker;
- avaliar compatibilidade de dados e migrações D1;
- reverter por workflow/controle de versão com operador autorizado;
- validar os fluxos essenciais após reversão.

Nunca reverter migração destrutiva sem backup e plano de recuperação.

# Deploy e infraestrutura

## 1. Frontend — GitHub Pages

O frontend é compilado pelo Vite e publicado no GitHub Pages usando GitHub Actions. O workflow principal é `.github/workflows/deploy.yml`.

### Pipeline observado

1. Checkout do repositório.
2. Instalação do pnpm.
3. Configuração do Node.js 20.
4. Instalação das dependências.
5. Execução de lint.
6. Typecheck.
7. Testes Vitest.
8. Build do Vite.
9. Validação dry-run do Cloudflare Worker.
10. Upload do artefato `dist`.
11. Publicação no GitHub Pages apenas em push para `main`.

Em Pull Requests, o workflow executa validações e build, mas não publica o site.

### Configuração

- Vite: `base: '/remedios_app/'` em `vite.config.ts`.
- GitHub: Settings → Pages → Build and deployment → Source: GitHub Actions.
- URL pública esperada: `https://alexsantossp71-lgtm.github.io/remedios_app/`.

Se o nome do repositório mudar, revisar o caminho base e os recursos do PWA.

## 2. Backend — Cloudflare Worker

O workflow `.github/workflows/deploy-proxy.yml` realiza o deploy do Worker quando há alterações em `worker/**` ou no próprio workflow, além de permitir execução manual.

Secrets exigidos pelo workflow:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NVIDIA_API_KEY`

Secret opcional:
- `POLLINATIONS_API_KEY`

O workflow também aplica migrações do Cloudflare D1 no banco remoto identificado como `remedios-push`, publica o Worker e configura o secret NVIDIA. Não coloque os valores dos secrets na documentação, no código-fonte ou em logs.

## 3. Variáveis e configurações

O workflow do frontend injeta `VITE_DEFAULT_PROXY_URL` durante o build com a URL pública do Worker. Essa variável contém apenas o endereço do serviço, não uma credencial.

As chaves privadas de provedores devem permanecer nos secrets do Worker. Tokens de implantação devem ter somente as permissões necessárias.

## 4. Procedimento de release recomendado

1. Criar branch a partir de `main`.
2. Implementar e testar a alteração.
3. Executar localmente lint, typecheck, testes e build.
4. Abrir Pull Request.
5. Conferir os checks do GitHub Actions e revisar o diff.
6. Fazer merge somente após resolução de conflitos e aprovação.
7. Confirmar o workflow de publicação.
8. Validar a aplicação publicada e os recursos essenciais.
9. Registrar a alteração em `CHANGELOG.md` (quando esse arquivo for adotado).

## 5. Verificação pós-deploy

- Página inicial carrega sem erro.
- Arquivos JS/CSS e ícones carregam no caminho `/remedios_app/`.
- PWA instala e service worker é registrado.
- Persistência local e backup funcionam.
- Recursos de IA respondem ou exibem mensagem de indisponibilidade apropriada.
- Push funciona somente após consentimento e registro.
- Não há credenciais expostas no bundle do navegador.

## 6. Recuperação

O workflow documenta o deploy, mas não define sozinho uma estratégia completa de rollback. Antes de releases críticos, registrar o commit anterior conhecido como estável e o procedimento de reversão do Worker e do frontend. Documentar backups e restauração do D1 após confirmar o esquema e a política de retenção.

# Stack tecnológica

## 1. Tecnologias identificadas

| Camada | Tecnologia | Uso |
|---|---|---|
| Linguagem | TypeScript | Código da aplicação e tipagem |
| Interface | React 18 | Componentes e estado da interface |
| Build e servidor local | Vite 5 | Desenvolvimento e compilação |
| Estilos | Tailwind CSS 3 | Utilitários de estilo |
| Testes | Vitest 2 | Testes automatizados |
| Qualidade | ESLint 9 | Análise estática |
| Runtime de desenvolvimento | Node.js 18+ (README); CI usa Node 20 | Ferramentas e scripts |
| Gerenciador de pacotes | pnpm 10.34.5 | Dependências do frontend |
| PWA | Web App Manifest + Service Worker | Instalação, cache e Push |
| Hospedagem frontend | GitHub Pages | Distribuição da aplicação |
| Backend de integração | Cloudflare Workers | Proxy de IA e endpoints Push |
| Banco backend | Cloudflare D1 | Dados de suporte a notificações, conforme workflow |
| IA | NVIDIA API; Pollinations opcional | Recursos de IA |

## 2. Dependências relevantes

Dependências de produção declaradas em `package.json`:
- `react` e `react-dom`: interface.
- `@block65/webcrypto-web-push`: suporte a Web Push.

Dependências de desenvolvimento incluem Vite, TypeScript, Tailwind CSS, Vitest, ESLint, PostCSS e tipos React.

As dependências efetivas devem ser sempre conferidas no `package.json` e no `pnpm-lock.yaml`; esta tabela não substitui esses arquivos.

## 3. Scripts npm/pnpm

| Script | Comando | Finalidade |
|---|---|---|
| `dev` | `vite` | Servidor de desenvolvimento |
| `build` | `vite build` | Build de produção |
| `preview` | `vite preview` | Pré-visualização do build |
| `typecheck` | `tsc --noEmit` | Verificação TypeScript |
| `test` | `vitest run` | Executar testes uma vez |
| `test:watch` | `vitest` | Testes em modo observação |
| `lint` | `eslint src worker` | Análise estática |

## 4. Configuração de build

O Vite define `base: '/remedios_app/'`, correspondente ao caminho do projeto no GitHub Pages. Se o repositório ou caminho público mudar, revisar `vite.config.ts`, manifesto, service worker e workflows.

O Vitest está configurado para testes em `src/**/*.test.ts` e `worker/**/*.test.ts`, no ambiente Node.

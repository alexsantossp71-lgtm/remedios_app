# Instalação e desenvolvimento

## 1. Pré-requisitos

- Node.js 18 ou superior (a integração contínua utiliza Node.js 20).
- pnpm 10.34.5, conforme `packageManager` do `package.json`.
- Git.
- Acesso ao repositório GitHub para obter o código.

## 2. Preparar o ambiente

```bash
git clone https://github.com/alexsantossp71-lgtm/remedios_app.git
cd remedios_app
pnpm install
```

## 3. Executar localmente

```bash
pnpm dev
```

O Vite exibirá no terminal o endereço local. Abra esse endereço no navegador.

## 4. Verificações antes de enviar alterações

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Corrija falhas antes de abrir um Pull Request. O workflow de CI também executa essas verificações.

## 5. Convenções de trabalho

- Faça alterações em uma branch específica, sem desenvolver diretamente em `main`.
- Prefira mudanças pequenas e focadas.
- Preserve os tipos e validadores de dados existentes.
- Não inclua chaves, tokens, dados pessoais ou arquivos de backup reais no Git.
- Ao alterar comportamento de lembretes, revise os casos de datas, fuso horário, duração, frequência e histórico.
- Ao alterar dados persistidos, considere compatibilidade com dados já salvos nos navegadores.
- Inclua ou atualize testes para regras de negócio e funções puras.
- Atualize a documentação correspondente.

## 6. Estrutura de código (visão inicial)

- `src/App.tsx`: composição da aplicação e coordenação do estado principal.
- `src/components/`: componentes de interface.
- `src/services/`: integrações e serviços.
- `src/utils/`: regras auxiliares e transformações.
- `src/data/`: dados locais auxiliares.
- `src/types.ts`: tipos do domínio.
- `src/storage.ts`: chaves, validação e persistência JSON.
- `public/`: manifesto, ícones e service worker.
- `worker/`: código e configuração do Cloudflare Worker.
- `.github/workflows/`: automações de CI/CD.

A lista é indicativa; confirme os diretórios atuais no repositório antes de adicionar novos módulos.

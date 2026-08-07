<div align="center">
  <img src="public/icons/icon-192.png" width="96" height="96" alt="Ícone do Remédio na Hora" />
  <h1>Remédio na Hora</h1>
  <p>Web app local e instalável para organizar medicamentos e acompanhar doses.</p>
</div>

## Recursos

- Lembretes diários, por intervalo de dias, contínuos ou com duração definida;
- múltiplos horários por medicamento;
- agenda diária e calendário mensal;
- registro de dose tomada, ignorada ou atrasada;
- alerta no aplicativo, som, notificação do navegador e adiamento por 10 minutos;
- edição, pausa e exclusão de lembretes;
- tema claro, escuro ou automático;
- instalação como PWA e funcionamento offline após o primeiro acesso;
- exportação e importação de uma cópia local dos dados;
- migração automática dos dados da versão anterior.

> **Aviso:** este aplicativo é uma ferramenta de organização e não substitui receita ou orientação profissional. Navegadores podem atrasar alertas quando o sistema restringe atividades em segundo plano.

## Privacidade

Os medicamentos e registros ficam no `localStorage` do próprio navegador. O app não possui backend, não envia dados de saúde a terceiros e não exige chave de API.

## Desenvolvimento

### Requisitos

- Node.js 22.13 ou superior;
- Corepack habilitado (`corepack enable`).

### Executar

```bash
pnpm install
pnpm dev
```

O Vite disponibiliza o projeto em `http://localhost:5173/remedios_app/`.

### Verificações

```bash
pnpm check       # lint, TypeScript e testes
pnpm build       # typecheck e build de produção
pnpm preview     # pré-visualiza o build
```

## Estrutura principal

```text
src/
├── components/       # interface e modais
├── data/             # sugestões locais de medicamentos
├── hooks/            # mecanismo de alertas
├── services/         # som e notificações do navegador
├── utils/            # datas, recorrência e persistência
├── App.tsx
└── index.tsx
public/
├── icons/
├── manifest.webmanifest
└── sw.js
```

## Deploy

O workflow `.github/workflows/deploy.yml` valida e publica o diretório `dist` com o GitHub Pages oficial. Nas configurações do repositório, selecione **Settings → Pages → Source: GitHub Actions**.

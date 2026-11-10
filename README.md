# Remédio na Hora 💊

Aplicativo (PWA) de lembretes de medicamentos feito com React + Vite + TypeScript.

Configure lembretes com horários, duração e frequência, acompanhe as doses em um
calendário e receba um alarme sonoro quando estiver na hora. Na aba **Minha
Saúde** você também cadastra seus médicos e consultas, com lembrete de 1 hora
ou 1 dia antes. Os dados ficam salvos no `localStorage` do navegador.

## Funcionalidades

- Cadastro de lembretes em 3 passos (remédio, frequência, horários).
- Sugestões de medicamentos via API do Google Gemini (com lista offline de
  30 medicamentos comuns quando a chave não está configurada ou há falha de rede).
- Calendário mensal com status das doses (tomada, ignorada, pendente) e
  marcação das consultas agendadas.
- **Minha Saúde:** cadastro de médicos (especialidade, CRM, telefone com
  botões de ligar e WhatsApp, clínica) e consultas (data/hora, local, motivo,
  observações e lembrete de 1 hora ou 1 dia antes).
- Modal de notificação com som de alarme, para doses e para consultas.
- Modo escuro automático e PWA instalável (service worker + manifest).

## Como rodar localmente

**Pré-requisitos:** Node.js 18+ e pnpm (o lockfile do projeto é o `pnpm-lock.yaml`).

```bash
pnpm install
cp .env.example .env.local   # preencha VITE_API_KEY com sua chave Gemini (opcional)
pnpm dev
```

A chave `VITE_API_KEY` é opcional para usar o app: sem ela a lista de
medicamentos sugerida usa a lista local embutida. Obtenha uma chave em
https://aistudio.google.com/apikey.

Importante: a chave é embutida no bundle JavaScript em tempo de build e
fica visível para qualquer visitante do site publicado. Para uso pessoal
isso é aceitável; para um público maior, prefira um proxy serverless.

## Build de produção

```bash
pnpm build      # gera a pasta dist/
pnpm preview    # serve o build localmente
```

## Deploy no GitHub Pages

O deploy é feito pelo workflow `.github/workflows/deploy.yml` (GitHub Actions):
um push em `main` roda typecheck, compila o app e publica com
`actions/upload-pages-artifact` + `actions/deploy-pages` — o método oficial,
que não depende de uma branch `gh-pages` nem de `CNAME`. Em pull requests,
o workflow roda apenas build + typecheck.

O `base` do Vite está configurado como `/remedios_app/` em `vite.config.ts`
(deve ser o nome do repositório). A URL final é
`https://<usuario>.github.io/remedios_app/`. Ajuste o `base` se o
repositório for renomeado.

Configuração única no repositório:

1. **Settings → Pages → Build and deployment → Source: `GitHub Actions`**
   (com o Source em "Deploy from a branch" o site publica código-fonte em
   vez do `dist/` — a causa do site quebrado).
2. *(Opcional)* **Settings → Secrets and variables → Actions → New repository
   secret** `VITE_API_KEY`, com sua chave Gemini, para habilitar as sugestões
   de medicamentos no app publicado. Sem o secret, o app usa a lista local.

Testar sem publicar: abra um pull request — o workflow roda build +
typecheck, mas não publica.

> Observação: os alarmes disparam enquanto o aplicativo estiver aberto no
> navegador (tecnologia de `setTimeout`). Para notificações em background
> seria necessário um backend de push notifications.


# Remédio na Hora 💊

Aplicativo (PWA) de lembretes de medicamentos feito com React + Vite + TypeScript.

Configure lembretes com horários, duração e frequência, acompanhe as doses em um
calendário e receba um alarme sonoro quando estiver na hora. Os dados ficam
salvos no `localStorage` do navegador.

## Funcionalidades

- Cadastro de lembretes em 3 passos (remédio, frequência, horários).
- Sugestões de medicamentos via API do Google Gemini (com lista padrão de fallback).
- Calendário mensal com status das doses (tomada, ignorada, pendente).
- Modal de notificação com som de alarme.
- Modo escuro automático e PWA instalável (service worker + manifest).

## Como rodar localmente

**Pré-requisito:** Node.js 18+.

```bash
npm install
cp .env.example .env.local   # preencha VITE_API_KEY com sua chave Gemini
npm run dev
```

A chave `VITE_API_KEY` é opcional para usar o app: sem ela a lista de
medicamentos sugerida usa o fallback embutido. Obtenha uma chave em
https://aistudio.google.com/apikey.

## Build de produção

```bash
npm run build      # gera a pasta dist/
npm run preview    # serve o build localmente
```

## Deploy no GitHub Pages

O deploy é feito pelo workflow `.github/workflows/deploy.yml` (GitHub Actions):
um push em `main` compila o app e publica com `actions/upload-pages-artifact`
+ `actions/deploy-pages` — o método oficial, que não depende de uma branch
`gh-pages` nem de `CNAME`.

O `base` do Vite está configurado como `/remedios_app/` em `vite.config.ts`
(deve ser o nome do repositório). A URL final é
`https://<usuario>.github.io/remedios_app/`. Ajuste o `base` se o
repositório for renomeado.

Configuração única no repositório:

1. **Settings → Pages → Build and deployment → Source: `GitHub Actions`**
   (com o Source em "Deploy from a branch" apontando para `main`, o site
   publica o código-fonte em vez do `dist/` — a causa do site quebrado).
2. *(Opcional)* **Settings → Secrets and variables → Actions → New repository
   secret** `VITE_API_KEY`, com sua chave Gemini, para habilitar as sugestões
   de medicamentos no app publicado. Sem o secret, o app usa a lista padrão.

Testar sem publicar: **Actions → Deploy to GitHub Pages → Run workflow**
marcando a opção "Apenas compilar". Em PRs o workflow só faz build + typecheck.

### Publicar direto da máquina (alternativa manual)

```bash
npm run deploy   # gera dist/ e publica na branch gh-pages
```

Esse caminho só tem efeito se o Source do Pages estiver como
"Deploy from a branch" apontando para `gh-pages` / `/ root`.

> Observação: os alarmes disparam enquanto o aplicativo estiver aberto no
> navegador (tecnologia de `setTimeout`). Para notificações em background
> seria necessário um backend de push notifications.


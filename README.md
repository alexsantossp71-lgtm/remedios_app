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

O `base` do Vite está configurado como `/remedios_app/` em `vite.config.ts`.
Altere esse valor caso o repositório tenha outro nome. O workflow em
`.github/workflows` publica automaticamente a pasta `dist/`.

> Observação: os alarmes disparam enquanto o aplicativo estiver aberto no
> navegador (tecnologia de `setTimeout`). Para notificações em background
> seria necessário um backend de push notifications.

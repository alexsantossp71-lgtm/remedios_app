# Remédio na Hora 💊

Aplicativo (PWA) de lembretes de medicamentos feito com React + Vite + TypeScript.

Configure lembretes com horários, duração e frequência, acompanhe as doses em um
calendário e receba um alarme sonoro quando estiver na hora. Na aba **Minha
Saúde** você também cadastra seus médicos, consultas, exames e plano de saúde,
com lembrete de 1 hora ou 1 dia antes das consultas. Os dados ficam salvos no
`localStorage` do navegador.

## Funcionalidades

- Cadastro de lembretes em 3 passos (remédio, frequência, horários).
- Sugestões de medicamentos via API da NVIDIA (com lista offline de
  30 medicamentos comuns quando a chave não está configurada ou há falha de rede).
- Calendário mensal com status das doses (tomada, ignorada, pendente) e
  marcação das consultas agendadas e dos exames agendados.
- **Minha Saúde:** cadastro de médicos (especialidade, CRM, telefone com
  botões de ligar e WhatsApp, clínica) e consultas (data/hora, local, motivo,
  observações e lembrete de 1 hora ou 1 dia antes).
- **IA (API NVIDIA):** importar receita por foto/texto e criar os lembretes de
  uma vez, análise de interações e duplicidades, bula simplificada, insights de
  adesão, resumo para a consulta, laudos de laboratório com histórico de
  marcadores, guardião da dose (confere o medicamento no alarme) e
  **agendamento inteligente** — a IA redistribui os horários das doses
  respeitando jejum, intervalos prescritos e o sono ("Omeprazol 30 min antes do
  café; mover a dose das 23h para 21h30"), com revisão e aplicação por
  medicamento.
- **Proxy de IA opcional (Cloudflare Worker):** com o proxy hospedado (pasta
  `worker/`), a IA funciona para todos sem cada pessoa criar a própria chave
  `nvapi-` — o segredo fica no servidor, com CORS por origem, allowlist de
  modelos e rate limit. O GitHub Pages continua 100% estático.
- **Exames:** registro do pedido à realização, com situação (solicitado,
  agendado, realizado), categoria (laboratório, imagem, cardiológico…), médico
  solicitante, local e resultado/laudo; exames agendados aparecem como ponto
  roxo no calendário. Foto do pedido é lida por OCR via **API da NVIDIA**
  (modelo de visão) e preenche os campos automaticamente (requer chave
  configurada no app).
- **Plano de saúde:** carteirinha com operadora, número copiável, titular,
  validade com selo de alerta (vence em breve / vencida), telefone do SAC e
  observações de cobertura — funciona também para o cartão do SUS. Foto da
  carteirinha é lida por OCR via **API da NVIDIA** (modelo de visão) e
  preenche os campos automaticamente (requer chave configurada no app).
- Formulários de cadastro com validação inline, máscaras automáticas de
  telefone e carteirinha, campos agrupados por seção e envio com Enter.
- Modal de notificação com som de alarme, para doses e para consultas.
- **Notificações do sistema** (opcionais): com a permissão ativada, a dose e a
  consulta são avisadas mesmo com o app em segundo plano (aba oculta ou tela
  apagada). Ao reabrir o app, doses de hoje que passaram do horário sem
  resposta aparecem no modal "Doses atrasadas" com botões Tomei / Pular.
- **Backup dos dados**: exportação e importação de arquivo JSON nas
  Configurações (lembretes com histórico, médicos, consultas, planos, exames e
  laudos laboratoriais) — a chave e o token da IA não são incluídos. Protege contra limpeza do
  navegador e facilita trocar de aparelho.
- Modo escuro automático e PWA instalável (service worker + manifest).

## Como rodar localmente

**Pré-requisitos:** Node.js 18+ e pnpm (o lockfile do projeto é o `pnpm-lock.yaml`).

```bash
pnpm install
pnpm dev
```

## IA (API NVIDIA) — opcional

Os recursos de IA (OCR da carteirinha do plano, OCR do pedido de exame, lista
online de medicamentos, interações, bula, adesão, resumo de consulta, laudos,
guardião da dose e agendamento inteligente) usam a API da NVIDIA
([build.nvidia.com](https://build.nvidia.com)), compatível com o formato
OpenAI. Há duas formas de ativar:

### Opção A — proxy de IA (sem chave por usuário)

Hospede o Worker da pasta [`worker/`](worker/README.md) uma vez. Usuários
autorizados poderão usar a IA sem cadastrar uma chave NVIDIA própria:

1. `cd worker && npx wrangler secret put NVIDIA_API_KEY` (sua chave `nvapi-`).
2. Gere um token longo e aleatório e cadastre-o com `npx wrangler secret put PROXY_TOKEN`.
3. Ajuste `ALLOWED_ORIGINS` no `wrangler.toml` com a URL do seu Pages.
4. `npx wrangler deploy`.
5. No app, cole a URL do Worker em **Ajustes → Proxy de IA** — ou defina
   `VITE_DEFAULT_PROXY_URL` no build para já vir configurado.

A chave NVIDIA e o token ficam **nos secrets do Worker**. Cada dispositivo autorizado deve informar o token em Configurações → Proxy de IA. CORS não é autenticação; o token compartilhado é adequado apenas para acesso privado/familiar, pois pode ser extraído por quem usa o app. Para um serviço público, implemente autenticação individual.

### Opção B — chave por usuário

1. Crie uma conta em build.nvidia.com e gere uma chave (botão **Get API Key**,
   começa com `nvapi-`).
2. No app, toque no botão **Ajustes** no topo e cole a chave.
3. Opcionalmente ajuste os modelos:
   - **Visão (OCR):** `meta/llama-3.2-90b-vision-instruct` (padrão);
   - **Texto (medicamentos):** `meta/llama-3.3-70b-instruct` (padrão).

A chave fica salva **apenas no dispositivo** (localStorage) e é enviada
somente para `integrate.api.nvidia.com` — nada é embutido no bundle nem
publicado no repositório. Se o proxy estiver configurado e cair, o app usa a
chave direta como reserva. Sem proxy nem chave, o app usa a lista local de
medicamentos e o cadastro manual da carteirinha e dos exames.

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
2. *(Opcional)* A chave da API NVIDIA **não** precisa de secret do GitHub:
   cada pessoa configura a própria chave pelo botão **IA** dentro do app.

Testar sem publicar: abra um pull request — o workflow roda build +
typecheck, mas não publica.

> Observação: os alarmes disparam enquanto o aplicativo estiver aberto no
> navegador (tecnologia de `setTimeout`). Para notificações em background
> seria necessário um backend de push notifications.


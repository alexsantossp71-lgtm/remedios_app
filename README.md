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
- **IA integrada:** os recursos de inteligência artificial usam automaticamente o serviço central do sistema. Chaves, tokens, endereço do proxy e modelos não são solicitados nem editáveis pelo usuário; a chave NVIDIA permanece exclusivamente no Cloudflare Worker.
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
  laudos laboratoriais) — as credenciais da IA não são incluídas. Protege contra limpeza do
  navegador e facilita trocar de aparelho.
- Modo escuro automático e PWA instalável (service worker + manifest).

## Como rodar localmente

**Pré-requisitos:** Node.js 18+ e pnpm (o lockfile do projeto é o `pnpm-lock.yaml`).

```bash
pnpm install
pnpm dev
```

## IA integrada

A aplicação utiliza o Cloudflare Worker configurado internamente para acessar a API NVIDIA. A chave `NVIDIA_API_KEY` fica exclusivamente nos secrets do Worker. O endereço do serviço e os modelos são parâmetros internos do sistema; o navegador não recebe chave NVIDIA nem token compartilhado. O deploy do Worker é feito pelo workflow `.github/workflows/deploy-proxy.yml`.

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


# PWA, cache e funcionamento offline

## Manifesto

O arquivo `public/manifest.webmanifest` declara:
- Nome: Remédio na Hora.
- Exibição standalone.
- Orientação portrait.
- Escopo e start URL relativos (`./`).
- Ícones de 192×192 e 512×512.
- Cores de tema e fundo.

## Service Worker

Implementação: `public/sw.js`.

### Instalação e ativação
- Abre cache versionado (`remedio-na-hora-cache-v16` no código consultado).
- Pré-armazena app shell: raiz, index, manifesto e ícones.
- Ativa imediatamente com `skipWaiting`.
- Na ativação, remove caches antigos e assume controle das páginas.

### Estratégia de rede
- Navegações: network-first; em falha, tenta cache da requisição ou `index.html`.
- Assets GET same-origin: cache-first; tenta rede e atualiza cache em background.
- Requisições não GET e cross-origin não são interceptadas.

### Push
O Service Worker recebe eventos Push, aceita somente o título e texto genéricos esperados, exibe notificação e abre/focaliza o escopo do app ao clicar.

## Limitações

- O cache do app shell não significa que todas as funcionalidades funcionem offline.
- Integrações com IA, catálogo remoto de medicamentos e Push dependem de rede/serviços externos.
- A atualização do cache depende da alteração do nome de cache no Service Worker.
- O navegador pode remover caches por pressão de armazenamento.
- A entrega de Push não é garantida.

## Checklist de release

- Incrementar o nome do cache quando necessário para invalidar app shell.
- Validar instalação e atualização em navegadores alvo.
- Testar abertura offline depois de uma instalação bem-sucedida.
- Confirmar escopo correto sob `/remedios_app/`.
- Verificar que não há cache de respostas clínicas ou dados pessoais de APIs cross-origin.
- Testar clique na notificação com app aberto e fechado.

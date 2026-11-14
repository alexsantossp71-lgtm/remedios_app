# Notificações Push

## Arquitetura

1. O usuário concede permissão de notificação no navegador.
2. O cliente aguarda o Service Worker e cria/recupera uma inscrição Push.
3. O cliente gera token aleatório de 32 bytes e envia token + inscrição para `POST /push/register`.
4. O Worker armazena a inscrição na Cloudflare D1, guardando hash SHA-256 do token.
5. O cliente calcula os próximos eventos e envia somente timestamps UTC para `POST /push/schedule`.
6. Um Cron Trigger executa o Worker a cada minuto.
7. O Worker busca eventos vencidos, envia Web Push com VAPID e marca tentativas/resultado na D1.
8. O Service Worker apresenta notificação genérica e, ao clicar, abre ou focaliza o aplicativo.

## Dados transmitidos

O agendamento Push do cliente envia uma lista de timestamps em milissegundos. Não envia nome do medicamento, dose ou histórico. A inscrição contém endpoint e chaves técnicas do navegador. O token Bearer é gerado localmente e o banco guarda seu hash.

## Limites observados

- Horizonte calculado pelo cliente: 30 dias.
- Máximo no cliente: 500 eventos.
- O Worker aceita eventos futuros até 31 dias.
- O Cron está configurado para cada minuto.
- A consulta do Worker processa até 5 eventos vencidos por execução.
- A mensagem visível é genérica: “Está na hora de conferir seus lembretes no aplicativo.”
- O envio depende de permissão, suporte do navegador, inscrição válida e configuração das chaves VAPID.

## Estados e falhas

- Permissão negada: Push não pode ser habilitado até que o usuário altere a permissão no navegador.
- Sem suporte a Service Worker/Push/Notification: recurso indisponível nesse navegador.
- Token ausente ou inválido: operações protegidas retornam não autorizado.
- Banco D1 indisponível: Worker retorna indisponibilidade.
- Endpoint de Push expirado: o serviço deve tratar a resposta do provedor e remover ou reprocessar inscrições conforme a lógica do módulo.
- Falha de sincronização: o cliente registra aviso no console; o usuário deve continuar podendo consultar os lembretes no app.

## Privacidade

A notificação não revela medicamento ou condição de saúde na tela bloqueada. Não adicionar detalhes clínicos ao payload sem análise de privacidade e risco. Não confundir Push com garantia de entrega: navegadores, sistemas operacionais, economia de bateria e provedores podem atrasar ou suprimir notificações.

## Verificações operacionais

Testar inscrição, renovação, atualização da agenda, cancelamento, evento vencido, falha do endpoint, permissão revogada, atualização do Service Worker e uso em dispositivos reais.

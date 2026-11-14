# Fluxos de dados e integrações

## 1. Dados mantidos no dispositivo

Os cadastros principais são lidos e gravados no armazenamento local ou no cofre protegido, conforme o estado de segurança configurado. O componente principal carrega lembretes, médicos, consultas, planos, exames e resultados laboratoriais a partir dos validadores e funções de persistência.

## 2. Fluxo de leitura de prescrição

1. Usuário seleciona imagem ou texto da receita.
2. Interface prepara a solicitação para o serviço de IA.
3. O frontend envia conteúdo necessário ao proxy configurado.
4. O Worker encaminha para o provedor habilitado.
5. A resposta é interpretada e sanitizada por `sanitizePrescriptionEntries`.
6. A aplicação transforma os itens em rascunhos de lembretes.
7. Usuário revisa e confirma os dados antes de salvar.

A extração por IA pode errar nomes, dose, frequência, duração e instruções. A interface deve permitir correção e não tratar OCR/IA como prescrição validada.

## 3. Fluxo de sugestão de horários

1. O aplicativo seleciona os lembretes existentes e monta um bloco estruturado de dados.
2. O serviço envia a solicitação ao provedor configurado.
3. A resposta passa por sanitização: IDs ou nomes devem corresponder a lembretes conhecidos; horários são normalizados e limitados.
4. O código calcula diferenças e intervalos mínimos, incluindo a passagem pela meia-noite.
5. O usuário analisa as propostas e decide se aplica.

A IA não pode criar ou remover medicamentos. A sugestão não pode alterar dose, frequência ou duração prescrita. A decisão final é do usuário, com orientação de profissional de saúde quando necessário.

## 4. Fluxo de adesão

O aplicativo agrega o histórico já registrado em janelas de 7 e 30 dias, incluindo doses esperadas, tomadas e não tomadas. O relatório compacto pode ser enviado à IA para gerar resumo e insights. A resposta é sanitizada e limitada antes de ser exibida.

## 5. Fluxo de Push

O cliente envia inscrição técnica e timestamps futuros ao Worker. O banco D1 guarda inscrição, hash de token e eventos agendados. O Cron envia mensagem genérica por Web Push. O nome do medicamento, dose e histórico não fazem parte do payload de agendamento documentado no cliente.

## 6. Mapa de compartilhamento com terceiros

| Destino | Dados enviados identificados | Finalidade |
|---|---|---|
| NVIDIA API via Worker | Mensagens e anexos incluídos nas solicitações de IA | Geração de resposta |
| Pollinations via Worker | Mensagens e anexos incluídos nas solicitações quando habilitado | Provedor alternativo |
| Cloudflare Worker Push | Inscrição técnica e instantes UTC | Agendar notificações |
| Cloudflare D1 | Endpoint e chaves técnicas Push, hash do token, timestamps e status | Gerenciar envio Push |
| GitHub Pages | Arquivos estáticos da aplicação | Distribuição do frontend |

Antes de uso comercial, mapear cada chamada real e revisar os dados que podem estar embutidos em prompts e imagens. Esta tabela não substitui inventário completo de tratamento nem contratos com fornecedores.

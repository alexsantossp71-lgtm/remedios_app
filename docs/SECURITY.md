# Segurança e proteção de dados

## 1. Natureza dos dados

O aplicativo pode armazenar informações pessoais e dados relacionados à saúde, como medicamentos, horários, médicos, consultas, exames, resultados laboratoriais e informações de plano de saúde. Esses dados exigem proteção reforçada e tratamento compatível com a LGPD.

Este documento registra controles observados no código e ações recomendadas. Não constitui declaração de conformidade legal ou certificação de segurança.

## 2. Controles observados

- A maior parte dos registros funcionais permanece no navegador.
- As chaves de persistência e validadores estão centralizados em `src/storage.ts`.
- O app importa uma camada `secureStorage` e oferece bloqueio/desbloqueio; as garantias criptográficas precisam ser confirmadas por revisão do código dessa camada.
- O README informa que credenciais de IA não são incluídas no backup.
- O cliente de IA utiliza proxy central; credenciais dos provedores são configuradas como secrets no Cloudflare Worker.
- O serviço Push envia instantes UTC para agendamento, sem nomes de medicamentos, doses ou histórico.
- O service worker exibe notificações genéricas, evitando conteúdo clínico na tela bloqueada.
- O registro Push solicita permissão do navegador e usa token aleatório por dispositivo.

## 3. Requisitos de segurança para desenvolvimento

- Nunca versionar chaves, tokens, arquivos de backup reais ou dados de usuários.
- Aplicar princípio do menor privilégio aos tokens GitHub e Cloudflare.
- Validar e limitar toda entrada recebida do navegador e dos provedores externos.
- Não confiar em conteúdo gerado por IA sem validação estrutural e revisão do usuário.
- Evitar dados de saúde em logs, mensagens de erro, analytics ou notificações visíveis.
- Utilizar HTTPS em todos os serviços externos.
- Revisar dependências e corrigir vulnerabilidades.
- Proteger endpoints do Worker contra abuso, replay, enumeração e consumo excessivo.
- Definir limites de taxa, tamanho de payload e retenção.
- Implementar resposta a incidentes e processo de comunicação aplicável.

## 4. Privacidade e LGPD

Antes de disponibilizar o produto amplamente, formalizar:
- controlador e operadores de dados;
- finalidades e bases legais aplicáveis;
- dados coletados e compartilhados com cada provedor;
- transparência e consentimento quando exigidos;
- direitos dos titulares e canal de atendimento;
- prazos de retenção e procedimento de exclusão;
- contratos e avaliação dos fornecedores;
- transferência internacional de dados, quando houver;
- procedimento para incidentes envolvendo dados pessoais.

Dados referentes à saúde são dados pessoais sensíveis na LGPD. A base legal e o desenho de tratamento devem ser avaliados por profissional jurídico especializado.

## 5. Segurança clínica da IA

A IA é ferramenta de apoio informacional. Não deve diagnosticar, prescrever ou substituir profissional de saúde. Em especial, a otimização de horários deve limitar-se a propor horários e nunca modificar dose, frequência ou duração prescrita. Alterações propostas devem ser claramente apresentadas para avaliação do usuário e, quando necessário, de médico ou farmacêutico.

## 6. Pendências prioritárias

1. Auditar a implementação de `secureStorage` e documentar o que protege, contra quais ameaças e quais limitações permanecem.
2. Revisar autenticação, autorização, validação e rate limiting de todas as rotas do Worker.
3. Revisar permissões e retenção do Cloudflare D1.
4. Fazer análise de dependências e varredura de segredos.
5. Criar plano de resposta a incidentes e procedimento de comunicação.
6. Validar textos de privacidade, consentimentos e termos com assessoria jurídica.
7. Fazer teste de segurança independente antes de uso institucional ou comercial.

# Integração com inteligência artificial

## 1. Objetivo e arquitetura

Os recursos de IA são acessados pelo serviço frontend `src/services/nvidiaService.ts`. O código centraliza as chamadas em um serviço interno/proxy e utiliza formato de requisição compatível com Chat Completions. O navegador não deve receber credenciais privadas dos provedores.

O endereço padrão do proxy identificado no código de notificações e no workflow é:

`https://remedios-ai-proxy.alexsantossp71.workers.dev`

A URL efetiva de IA é resolvida pelas configurações internas do aplicativo (`effectiveProxyUrl` e `readAiSettings`). O endereço e as credenciais não devem ser expostos como campos editáveis comuns para o usuário final.

## 2. Provedores

- **NVIDIA API:** provedor integrado. A chave `NVIDIA_API_KEY` é configurada como secret do Cloudflare Worker pelo workflow de deploy.
- **Pollinations:** integração opcional. O código de IA tenta esse provedor quando o consentimento/configuração correspondente está habilitado; em caso de falha, tenta o fluxo de fallback NVIDIA. O secret `POLLINATIONS_API_KEY` é opcional no workflow.

O README descreve a integração Pollinations como experimental. Não se deve presumir que esteja operacional em todos os ambientes: a disponibilidade depende de secret, configuração do Worker, provedor e modelo.

## 3. Fluxo simplificado

1. Um componente solicita uma operação de IA.
2. O serviço frontend prepara mensagens e parâmetros.
3. A chamada é enviada ao proxy central.
4. O proxy encaminha a requisição ao provedor configurado.
5. A resposta é extraída e validada/sanitizada pelas funções específicas do domínio.
6. A interface apresenta o resultado para revisão do usuário.

O serviço frontend define timeout padrão de 12 segundos para chamadas de chat. O catálogo de modelos tem cache de cinco minutos, conforme constantes no código.

## 4. Capacidades identificadas no produto

O README e os módulos importados pela aplicação descrevem recursos como:
- leitura/importação de prescrições por imagem ou texto;
- análise de interações e possíveis duplicidades;
- explicações simplificadas de medicamentos;
- insights de adesão;
- resumo para consulta;
- leitura de laudos laboratoriais;
- conferência de medicamento no alarme;
- sugestão de redistribuição de horários.

A lista descreve recursos anunciados/documentados no projeto, não uma certificação de precisão clínica.

## 5. Segurança e limites de uso

- IA não deve prescrever, diagnosticar ou substituir médico/farmacêutico.
- Sugestões de horário não podem alterar dose, frequência ou duração prescrita.
- A aplicação deve apresentar propostas para revisão explícita do usuário antes de aplicá-las.
- Respostas externas devem ser tratadas como conteúdo não confiável: validar JSON, campos, tipos e limites.
- Não enviar mais dados pessoais ou de saúde do que o estritamente necessário para a operação.
- Nunca registrar chaves de API, tokens ou conteúdo sensível em logs públicos.
- Em falha, timeout ou resposta inválida, informar indisponibilidade sem inventar uma resposta clínica.

## 6. Tratamento de falhas

O serviço possui uma mensagem amigável para indisponibilidade e uma classe `AiError` que pode carregar status HTTP. O fluxo deve distinguir falhas de rede, timeout, status HTTP, resposta vazia e conteúdo inválido.

## 7. Pendências para completar o contrato

- Registrar rotas, métodos, cabeçalhos e esquemas exatos do Worker.
- Listar modelos efetivamente configurados por tarefa, com data de revisão.
- Documentar limites, cotas, custos e política de fallback.
- Definir testes de contrato com respostas válidas, malformadas, vazias e lentas.
- Definir política de consentimento e transparência para cada envio de dados de saúde.

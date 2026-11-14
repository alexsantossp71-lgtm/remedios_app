# Tratamento de erros e recuperação

## Frontend

### Persistência
`src/storage.ts` encapsula leitura e gravação do localStorage:
- Falha de leitura/JSON inválido: retorna null e registra aviso/erro no console.
- Estrutura inválida: descarta o valor lido.
- Falha de gravação (por exemplo, quota): retorna false.
A camada de cofre protegido mantém fila de gravação e expõe `flushSecureWrites` para confirmar persistência pendente.

### Inteligência artificial
O serviço `nvidiaService` usa `AiError` com mensagem amigável e, quando aplicável, status HTTP. Distingue falha de rede, timeout, erro HTTP, resposta vazia e conteúdo inválido. Há timeout padrão de 12 segundos para chamadas de chat; o catálogo de modelos possui cache de cinco minutos. A interface deve informar indisponibilidade sem substituir falha por resposta inventada.

### Recursos externos
- Catálogo remoto de medicamentos pode falhar e a aplicação utiliza uma lista offline de fallback.
- Falha de sincronização Push é registrada no console; lembretes locais continuam sendo a referência no dispositivo.
- Falhas de permissão ou suporte Push devem ser comunicadas sem impedir o uso das demais funções.

## Worker

O proxy responde com códigos HTTP específicos para origem, payload, tamanho, modelo, limite, configuração e indisponibilidade do provedor. Respostas upstream podem ser repassadas ao cliente. A API deve evitar incluir segredos ou conteúdo sensível nas mensagens de erro.

## Recomendações de logging

- Não registrar prompts completos que contenham dados de saúde.
- Não registrar tokens Bearer, chaves API, chaves VAPID privadas ou senhas.
- Registrar apenas identificador de correlação, rota, status, duração e categoria de falha, quando implementado.
- Restringir acesso e retenção dos logs.

## Procedimento de suporte

1. Registrar versão do app, navegador, sistema operacional e horário aproximado do erro.
2. Solicitar descrição do passo que levou ao problema, sem pedir dados clínicos desnecessários.
3. Reproduzir com dados fictícios.
4. Consultar status do deploy e provedor.
5. Não solicitar senha do cofre nem arquivo de backup sem necessidade e consentimento explícito.
6. Registrar causa, correção e teste de regressão.

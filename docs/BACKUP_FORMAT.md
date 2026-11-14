# Contrato de backup e restauração

## Funcionalidade documentada

O README informa exportação e importação de arquivo JSON em Configurações. O conjunto anunciado inclui lembretes e histórico, médicos, consultas, planos, exames e laudos laboratoriais. Credenciais de IA não devem fazer parte do backup.

## O que está confirmado e o que falta confirmar

Confirmado: formato externo JSON; categorias listadas acima; credenciais de IA excluídas; dados principais locais no navegador.

Ainda precisa ser confirmado na rotina de exportação/importação: envelope e versão; nomes exatos das propriedades; inclusão de configurações, caches e dados do cofre; comportamento para coleções ausentes; substituição ou mesclagem; duplicidade de IDs; atomicidade; limites de tamanho; tratamento de falha parcial.

Não use este documento como especificação de parser até que esses pontos sejam auditados e cobertos por testes.

## Proposta de envelope versionado

O exemplo abaixo é uma proposta futura, não o formato atualmente confirmado:

    {
      "format": "remedio-na-hora-backup",
      "version": 1,
      "exportedAt": "ISO-8601",
      "appVersion": "versão",
      "data": {
        "reminders": [],
        "doctors": [],
        "appointments": [],
        "plans": [],
        "exams": [],
        "labs": []
      }
    }

## Requisitos de exportação

- Serializar apenas campos permitidos e documentados.
- Excluir tokens, credenciais, chaves criptográficas e segredos.
- Avisar que o arquivo pode conter dados sensíveis de saúde.
- Não enviar o backup a serviços externos.
- Tratar falhas de serialização e download sem apagar dados locais.

## Requisitos de importação

1. Ler o arquivo sem alterar o armazenamento atual.
2. Validar JSON, versão, tipos, tamanho e campos obrigatórios.
3. Mostrar resumo do que será importado e se haverá substituição.
4. Criar cópia dos dados atuais antes da operação.
5. Aplicar a importação de modo consistente; em erro, preservar estado anterior.
6. Apresentar resultado sem exibir conteúdo clínico em logs.
7. Oferecer exportação após migração de formato.

## Matriz mínima de testes

| Cenário | Resultado esperado |
|---|---|
| Backup válido | Importa sem perda |
| JSON inválido ou truncado | Rejeita sem alterar dados |
| Versão futura desconhecida | Rejeita com orientação |
| Campo obrigatório ausente | Rejeita ou aplica regra explícita |
| Coleção vazia | Preserva sem criar dados fictícios |
| Registro duplicado | Política determinística e testada |
| Arquivo muito grande | Rejeita com mensagem clara |
| Falha durante gravação | Mantém ou restaura estado anterior |
| Backup sem credenciais | Não solicita nem inventa credenciais |
| Versão antiga | Migra por função versionada ou rejeita com segurança |

Backup JSON deve ser tratado como dado sensível, mesmo que o cofre local esteja habilitado. Criptografia do armazenamento não significa que o arquivo exportado esteja criptografado.

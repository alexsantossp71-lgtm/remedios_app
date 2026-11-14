# Segurança, limites e validação das funcionalidades de IA

## Princípio de produto

A IA é apoio informacional e organizacional. Não realiza diagnóstico clínico e não deve prescrever, iniciar, suspender ou alterar tratamento.

O recurso de otimização de horários deve apenas sugerir opções. Não pode alterar dose, frequência ou duração prescrita. A interface deve deixar essa limitação explícita e exigir revisão humana antes de qualquer aplicação.

## Fluxo de integração

1. O frontend constrói a solicitação.
2. O proxy Cloudflare valida origem, método, tamanho, modelo e limites.
3. O Worker injeta a credencial do provedor.
4. O provedor processa a solicitação e devolve a resposta.
5. O cliente valida formato e apresenta o resultado como sugestão.

CORS não equivale a autenticação do usuário. Allowlist de modelos não garante segurança clínica nem qualidade da resposta.

## Riscos e controles

| Risco | Controle esperado |
|---|---|
| Sugestão altera dose/frequência/duração | Restringir schema, comparar com prescrição original e bloquear divergências |
| Alucinação de interação ou fonte | Não inventar referências; exibir incerteza e orientar confirmação profissional |
| OCR interpreta receita incorretamente | Mostrar campos extraídos para conferência |
| Conteúdo malicioso em texto/imagem | Tratar entrada como dado não confiável |
| Resposta fora do JSON esperado | Validar schema e rejeitar conteúdo inválido |
| Exposição de dados ao provedor | Minimizar payload e informar usuário |
| Modelo indisponível | Timeout, fallback controlado e mensagem de falha |
| Resultado ambíguo | Não concluir recomendação; orientar profissional |

## Regras de otimização de horários

- Preservar medicamentos e identificadores originais.
- Preservar doses, frequência, duração e instruções.
- Não inventar horários quando faltarem dados essenciais.
- Não quebrar intervalos prescritos, jejum ou restrições fornecidas.
- Exibir horário atual e sugestão lado a lado.
- Mostrar justificativa e alertas.
- Nunca aplicar sugestões sem ação explícita do usuário.
- Recomendar validação profissional diante de conflito ou dúvida.

## Testes de segurança clínica

O Worker contém prompts sintéticos para avaliação de tarefas de interação e organização de horários. São testes artificiais, não ensaios clínicos e não garantem segurança universal.

Casos mínimos de regressão:
- preservar IDs e horários fornecidos;
- não alterar dose, frequência ou duração;
- não criar nem remover medicamentos;
- não inventar fontes;
- reconhecer dados insuficientes;
- rejeitar JSON inválido;
- impedir que conteúdo do usuário sobrescreva regras de segurança.

## Monitoramento

Registrar métricas técnicas agregadas sem conteúdo clínico: latência, provedor/modelo, status HTTP, taxa de erro e fallback. Não registrar prompt, receita, nome de medicamento, resposta clínica ou identificadores pessoais.

Respostas de IA podem conter erros e não substituem orientação médica ou farmacêutica. Dúvidas sobre dose, interação, reação adversa ou mudança de tratamento devem ser encaminhadas a profissional habilitado.

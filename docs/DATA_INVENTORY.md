# Inventário de dados e privacidade

## Objetivo

Mapear categorias de dados observadas no aplicativo e seus locais de processamento para apoiar minimização, transparência e avaliação LGPD. Este inventário técnico não substitui o registro formal das operações de tratamento nem parecer jurídico.

## Inventário no navegador

| Categoria | Exemplos | Identificador/local observado | Sensibilidade |
|---|---|---|---|
| Lembretes | medicamento, dose, frequência, horários, histórico | medicationReminders / camada secureStorage usada pela aplicação | Saúde |
| Médicos | nome, especialidade, CRM, telefone, clínica | healthDoctors | Pessoal |
| Consultas | data/hora, local, motivo, observações, médico | healthAppointments | Saúde |
| Plano/cartão | operadora, número, titular, validade, cobertura | healthPlans | Pessoal/sensível conforme conteúdo |
| Exames | pedido, categoria, estado, data, médico, resultado/foto | healthExams | Saúde |
| Resultados laboratoriais | laboratório, data, valores, unidades, referências e imagens | healthLabResults | Saúde |
| Configuração IA | preferências | aiSettings | Configuração |
| Cache IA | explicações e análises | aiMedicationGuides, aiAdherenceInsights | Pode conter saúde |
| Token Push | identificador aleatório do dispositivo | remedioPushDeviceToken | Identificador técnico |

## Dados enviados ao Worker

### Proxy de IA

Funcionalidades de IA podem enviar mensagens e conteúdo fornecido pelo usuário ao proxy e ao provedor configurado. O conteúdo exato depende do recurso utilizado. Antes de uso real, revisar cada chamada de serviço para documentar campos, finalidade, retenção e destino. Não presumir que todo conteúdo fica apenas no dispositivo.

### Push

O cliente agenda instantes UTC. O Worker armazena dados técnicos de inscrição e horários, sem nome de medicamento, dose ou histórico. A notificação usa título e corpo genéricos.

## Minimização e controles

- Enviar apenas campos estritamente necessários.
- Usar dados fictícios em testes e screenshots.
- Não incluir dados de saúde em telemetria ou logs.
- Não colocar conteúdo clínico no payload Push ou na tela bloqueada.
- Revisar caches e sua expiração.
- Informar provedores externos e transferências internacionais.
- Definir prazos de retenção e exclusão para dados locais, Worker e provedores.
- Documentar canal de atendimento aos titulares.

## Decisões necessárias do controlador

1. Quem é controlador e quem são operadores?
2. Quais finalidades e bases legais se aplicam?
3. Quais provedores recebem dados e em quais países?
4. Quais prazos de retenção se aplicam a prompts, logs, cache e Push?
5. Como o titular solicita acesso, correção, portabilidade e eliminação?
6. Como será avaliado e comunicado um incidente?

Este inventário foi produzido a partir do código e deve ser revisto a cada integração ou mudança de finalidade. Não comprova conformidade LGPD.

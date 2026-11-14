# Modelo de domínio

**Fonte principal:** `src/types.ts`. Este documento descreve os tipos TypeScript encontrados no código, não um esquema relacional.

## Entidades

### Reminder — lembrete de medicamento
| Campo | Tipo | Significado |
|---|---|---|
| id | string | Identificador |
| medicationName | string | Nome do medicamento |
| dosage? | string | Quantidade por dose |
| instructions? | string | Instruções de uso |
| startDate | string | Data local `YYYY-MM-DD` |
| duration | days/continuous + days | Duração definida ou contínua |
| frequency | daily/interval + days | Frequência diária ou intervalo em dias |
| times | string[] | Horários locais `HH:MM` |
| history | Record | Situação de cada dose por data e horário |
| createdAt? | string | Instante de criação em ISO |

Estados do histórico: `taken` e `skipped`. Uma dose sem estado explícito pode permanecer pendente ou ser identificada como não respondida conforme as regras da aplicação.

### Doctor — profissional
Identificador, nome, especialidade, CRM, telefone e clínica.

### Appointment — consulta
Identificador, referência opcional ao médico, cópia do nome do médico, data/hora local ISO, local, motivo, observações, antecedência do lembrete e offsets já notificados.

### HealthPlan — plano ou cartão SUS
Operadora, nome do plano, número do cartão, titular, validade, telefone e cobertura.

### Exam — exame
Nome, categoria, status (`requested`, `scheduled`, `done`), data, horário opcional, lembrete, foto opcional, médico, local e resultados.

### LabResult — laudo laboratorial
Data, laboratório, foto opcional, valores medidos, observações e instante de criação. Cada `LabValue` pode registrar valor textual e numérico, unidade, faixa de referência e classificação calculada no aplicativo (`low`, `normal`, `high` ou vazia).

## Relacionamentos

- Appointment referencia Doctor por `doctorId`, mas mantém `doctorName` como snapshot para preservar a identificação caso o cadastro do médico seja removido.
- Exam referencia Doctor por `doctorId` e também mantém `doctorName`.
- Reminder mantém medicamento e posologia como campos próprios; não há entidade Medication persistida para cada lembrete no modelo exibido.
- LabResult mantém os valores do laudo embutidos no array `values`.

## Datas e horários

- Datas civis de lembretes e exames usam `YYYY-MM-DD` e devem ser interpretadas no fuso local, não como UTC.
- Horários de dose usam `HH:MM` local.
- Appointment usa `YYYY-MM-DDTHH:MM` local, conforme comentário do tipo.
- Instantes de criação usam ISO.
- A sincronização Push converte os horários para timestamps em milissegundos UTC.

## Regras de evolução

Mudanças nos tipos exigem revisão dos validadores de `src/storage.ts`, formulários, cálculos de agenda, importação/exportação de backup e testes. Não renomear nem remover campos persistidos sem estratégia de migração compatível com dados já gravados nos dispositivos.

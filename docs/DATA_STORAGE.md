# Dados e armazenamento

## 1. Estratégia observada

A aplicação mantém a maior parte dos dados funcionais no navegador. `src/storage.ts` centraliza chaves do `localStorage`, leitura/escrita JSON e validadores estruturais. `src/App.tsx` utiliza também uma camada chamada `secureStorage`; a implementação criptográfica e seu modelo de chaves precisam de revisão específica antes de se afirmar o nível de proteção oferecido.

Não há evidência, nos arquivos examinados, de uma conta de usuário com sincronização geral dos dados clínicos entre dispositivos. O README descreve backup e restauração manuais em JSON.

## 2. Categorias de dados identificadas

| Categoria | Chave local | Tipo principal |
|---|---|---|
| Lembretes e histórico de doses | `medicationReminders` | `Reminder[]` |
| Médicos | `healthDoctors` | `Doctor[]` |
| Consultas | `healthAppointments` | `Appointment[]` |
| Planos/cartão SUS | `healthPlans` | `HealthPlan[]` |
| Exames | `healthExams` | `Exam[]` |
| Resultados laboratoriais | `healthLabResults` | `LabResult[]` |
| Configurações de IA | `aiSettings` | Configurações locais |
| Cache de explicações | `aiMedicationGuides` | Cache local |
| Cache de adesão | `aiAdherenceInsights` | Cache local |

As chaves acima estão declaradas em `src/storage.ts`. O formato completo das entidades está em `src/types.ts`.

## 3. Entidades principais

- **Reminder:** medicamento, dose opcional, instruções, início, duração, frequência, horários e histórico diário.
- **Doctor:** nome, especialidade, CRM, telefone e clínica.
- **Appointment:** médico associado, data/hora, local, motivo, observações e lembretes.
- **HealthPlan:** operadora, plano, número do cartão, titular, validade e cobertura.
- **Exam:** nome, categoria, estado, data, médico, local, resultado e eventual foto.
- **LabResult:** data, laboratório, foto, observações e valores medidos, incluindo unidades e faixas de referência.

## 4. Validação e integridade

Os validadores em `src/storage.ts` verificam propriedades estruturais mínimas antes de aceitar arrays recuperados. Dados inválidos ou corrompidos são ignorados e registrados no console. Essa validação estrutural não equivale a validação clínica nem a uma validação semântica completa.

Ao modificar interfaces em `src/types.ts`, atualize os validadores, a lógica de importação/exportação, a compatibilidade com dados antigos e os testes.

## 5. Backup e restauração

O README documenta exportação e importação de backup JSON nas Configurações. O backup abrange lembretes com histórico e registros de saúde citados no README; credenciais de IA não devem ser incluídas.

Antes de restaurar:
- confirme que o arquivo veio do aplicativo;
- valide a estrutura e os tipos;
- evite importar arquivos de terceiros ou desconhecidos;
- faça um backup atual antes de substituir dados.

## 6. Notificações Push e minimização

O cliente armazena um token de dispositivo em `localStorage` sob a chave `remedioPushDeviceToken`. O serviço `src/services/pushNotifications.ts` envia ao Worker uma lista de instantes UTC para os próximos 30 dias, limitada a 500 eventos. O código comenta explicitamente que nomes, doses e histórico permanecem no aparelho e não são enviados nesse agendamento.

O payload Push exibido pelo service worker é genérico, sem nome de medicamento ou informação clínica.

## 7. Pendências

- Documentar em detalhe o conteúdo e formato do backup JSON.
- Revisar o mecanismo de `secureStorage` e documentar garantias e limitações reais.
- Documentar migrações de versão e recuperação de dados corrompidos.
- Inspecionar esquema D1, prazos de retenção e dados efetivamente armazenados no Worker.

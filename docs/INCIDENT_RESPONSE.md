# Plano de resposta a incidentes

## Escopo

Aplica-se a incidentes envolvendo frontend, Cloudflare Worker, D1, credenciais, notificações Push, dependências e possível exposição de dados pessoais ou de saúde.

## Classificação inicial

| Severidade | Exemplos | Ação inicial |
|---|---|---|
| Crítica | Exposição confirmada de dados de saúde, chave privada comprometida, acesso não autorizado em escala | Conter imediatamente e acionar responsáveis técnico e privacidade/jurídico |
| Alta | Abuso do proxy, comprometimento de conta de deploy, falha ampla de notificações | Limitar superfície afetada e investigar prioritariamente |
| Média | Indisponibilidade parcial, falha restrita de agendamento, regressão sem evidência de exposição | Mitigar, registrar impacto e corrigir |
| Baixa | Erro visual ou falha isolada sem impacto em dados/segurança | Registrar e corrigir no ciclo normal |

## Procedimento

### 1. Detectar e registrar
- Registrar horário, sistema, sintoma, versão/commit e origem.
- Preservar logs e evidências com acesso restrito.
- Não copiar dados pessoais para issue pública.
- Não apagar evidências antes da análise.

### 2. Conter
- Revogar ou rotacionar secrets suspeitos (NVIDIA, VAPID, Cloudflare).
- Restringir origens, modelos ou rotas quando necessário.
- Desabilitar temporariamente integração comprometida, se seguro.
- Revogar inscrições Push comprometidas.
- Evitar alterações destrutivas na D1 durante contenção.

### 3. Avaliar impacto
- Identificar sistemas, endpoints, dados e período envolvidos.
- Determinar se dados pessoais ou sensíveis foram acessados.
- Identificar titulares e fornecedores potencialmente envolvidos.
- Envolver controlador e assessoria jurídica/privacidade para avaliar obrigações de comunicação.

### 4. Erradicar e recuperar
- Corrigir causa raiz em branch e PR.
- Atualizar dependências e segredos.
- Restaurar serviço por procedimento revisado.
- Validar integridade e fluxos essenciais.
- Monitorar recorrência.

### 5. Encerrar e aprender
- Produzir relatório pós-incidente sem dados pessoais desnecessários.
- Documentar linha do tempo, causa, impacto, contenção e correções.
- Criar tarefas com responsáveis e prazos.
- Atualizar threat model, runbook, testes e inventário.

## Evidências e comunicação

Restringir acesso às evidências. Nunca registrar secrets, tokens completos, endpoint Push ou conteúdo clínico. Comunicação externa deve ser coordenada pelo responsável designado. A avaliação de comunicação à ANPD e aos titulares deve seguir legislação e regulamentação aplicáveis, com orientação jurídica.

## Preparação recomendada

- Definir responsáveis titular e substituto para segurança, infraestrutura e privacidade.
- Manter inventário de secrets e procedimento de rotação.
- Testar restauração D1 e rollback do Worker.
- Configurar alertas de erros, consumo e mudanças de configuração.
- Realizar simulado periódico.
- Definir contatos de emergência dos fornecedores.

Registro mínimo: ID; detecção; severidade; sistemas; resumo sanitizado; dados potencialmente afetados; contenção; decisão de comunicação; causa raiz; ações; responsável; encerramento.

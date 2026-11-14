# Modelo de ameaças e controles

**Escopo:** aplicação web/PWA, armazenamento no navegador, Worker de IA e Worker Push.  
**Este documento é uma análise inicial de engenharia, não uma auditoria independente.**

## Ativos a proteger

- Dados pessoais e de saúde inseridos pelo usuário.
- Senha e conteúdo do cofre local.
- Credenciais NVIDIA, Pollinations e VAPID privada.
- Inscrições Push e tokens de dispositivos.
- Disponibilidade e orçamento do proxy de IA.
- Integridade dos lembretes e horários exibidos.

## Atores e ameaças

| Ameaça | Impacto | Controles observados | Trabalho adicional |
|---|---|---|---|
| Acesso físico ao dispositivo | Exposição de dados locais | Cofre criptografado opcional | Bloqueio automático, orientação de senha, teste de recuperação |
| XSS ou dependência comprometida | Acesso aos dados em memória e chamadas autenticadas | Validação de dados e dependências fixadas por lockfile | CSP, auditoria de dependências, revisão de scripts |
| Roubo de segredo do provedor | Custo e abuso de IA | Secrets no Worker; allowlist e rate limit | Rotação, alertas de custo, quotas no provedor |
| Abuso do proxy | Indisponibilidade/custo | CORS, allowlist de modelos, limite de corpo e rate limit | Limite global persistente, autenticação/atestado de cliente quando aplicável |
| Origem não autorizada | Uso via navegador de outra origem | CORS por correspondência exata | Não tratar CORS como autenticação; considerar proteção adicional |
| Token Push roubado | Controle da inscrição daquele dispositivo | Token aleatório, hash SHA-256 em D1 | Rotação, expiração, revogação e proteção contra abuso |
| Endpoint Push malicioso | SSRF/uso indevido do Worker | HTTPS e allowlist de hosts Push | Testes específicos de validação de URL e DNS |
| Resposta de IA incorreta | Decisão inadequada do usuário | Sanitização por domínio e revisão explícita | Testes adversariais, fontes verificáveis, UX de incerteza |
| Vazamento por notificação | Exposição na tela bloqueada | Mensagem genérica | Manter payload sem dados clínicos |
| Perda/corrupção local | Perda de histórico e cadastros | Backup JSON e validadores | Testar restauração, exportação protegida e migrações |

## Princípios de mitigação

- Menor privilégio para tokens e permissões.
- Minimização de dados enviados a terceiros.
- Segredos somente no ambiente server-side.
- Validação de entrada e saída em fronteiras externas.
- Falha segura: indisponibilidade não deve virar recomendação clínica inventada.
- Logs sem conteúdo de saúde, tokens ou credenciais.
- Revisão de segurança antes de releases que alterem dados, criptografia, proxy ou Push.

## Riscos residuais importantes

- CORS não autentica clientes; scripts fora do navegador podem chamar o endpoint.
- Rate limit em memória não é global nem persistente.
- O cofre local não protege contra código malicioso executado na origem enquanto desbloqueado.
- O uso de provedores externos pode envolver tratamento/transferência de conteúdo enviado nas requisições; mapear exatamente os dados enviados e os termos dos fornecedores.
- Não existe, nesta documentação, evidência de pentest, certificação ou avaliação formal de impacto à proteção de dados.

## Plano mínimo de revisão

1. Revisar CSP e política de dependências.
2. Fazer threat modeling de cada nova integração.
3. Auditar rotas do Worker e banco D1.
4. Testar limites e cenários de abuso.
5. Validar backup, restauração e migrações.
6. Revisar o fluxo de dados enviados à IA e obter avaliação de privacidade.
7. Registrar achados, severidade, responsável e correção.

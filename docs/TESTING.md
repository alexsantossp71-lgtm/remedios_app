# Testes e qualidade

## 1. Ferramentas

- Vitest para testes automatizados de regras e serviços.
- Node.js Test Runner para integração isolada dos eventos do Service Worker.
- TypeScript em modo estrito para verificação estática.
- ESLint para análise estática.
- Vite para build de produção.

## 2. Comandos

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:service-worker
pnpm build
```

## 3. Escopo de testes configurado

O `vite.config.ts` inclui:
- `src/**/*.test.ts`
- `worker/**/*.test.ts`

O Vitest roda em Node e cobre regras locais de alarmes, inscrição Push, geração/sincronização dos próximos eventos, consentimento, falhas de rede e privacidade do payload. O Node Test Runner executa o arquivo real `public/sw.js` em um harness controlado para verificar instalação, atualização do cache, recebimento de Push genérico e clique na notificação.

## 4. Áreas críticas para cobertura

| Área | Casos recomendados |
|---|---|
| Frequência e duração | Diário, intervalos, término e uso contínuo |
| Datas e horários | Virada do dia, horário de verão/fuso, datas inválidas |
| Histórico de doses | Tomada, ignorada, pendente e doses atrasadas |
| Persistência | JSON inválido, chave ausente, cota excedida |
| Backup | Exportação, importação, arquivo malformado e compatibilidade |
| IA | Timeout, erro HTTP, resposta vazia, JSON inválido e fallback |
| Agendamento inteligente | Não alterar dose, frequência ou duração |
| Lembretes | Próximo horário, início, duração, frequência, histórico e horários inválidos |
| Push | Permissão, inscrição existente/nova, sincronização, limite de eventos, cancelamento e falhas de rede |
| Service Worker | Cache do app shell, ativação, Push genérico, proteção contra payload clínico e clique para abrir/focar o app |
| PWA | Instalação, atualização de cache e abertura offline |

## 5. Critérios para Pull Request

- Checks automatizados aprovados.
- Alteração revisada quanto a regressões.
- Testes novos ou atualizados quando houver regra nova.
- Documentação atualizada.
- Nenhum segredo ou dado pessoal incluído.
- Mudanças em persistência compatíveis com dados já existentes.

## 6. Limitações

Os testes automatizados exercitam as regras e o código real do Service Worker com APIs simuladas; eles não comprovam entrega Push por provedores reais. Antes de uma versão estável, validar em dispositivos reais: conceder/revogar permissão, receber Push com o app fechado, clicar na notificação, reinstalar/atualizar o Service Worker e verificar o comportamento após reiniciar o navegador. Isso não substitui testes de acessibilidade, testes de segurança, avaliação clínica nem validação operacional do serviço remoto.

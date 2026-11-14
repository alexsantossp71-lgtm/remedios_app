# Testes e qualidade

## 1. Ferramentas

- Vitest para testes automatizados.
- TypeScript em modo estrito para verificação estática.
- ESLint para análise estática.
- Vite para build de produção.

## 2. Comandos

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 3. Escopo de testes configurado

O `vite.config.ts` inclui:
- `src/**/*.test.ts`
- `worker/**/*.test.ts`

O ambiente configurado é Node. O comentário da configuração cita testes de funções puras relacionadas a data/hora, máscaras, adesão, extração de JSON e helpers do proxy.

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
| Push | Consentimento, registro, sincronização, cancelamento e token inválido |
| PWA | Instalação, atualização de cache e abertura offline |

## 5. Critérios para Pull Request

- Checks automatizados aprovados.
- Alteração revisada quanto a regressões.
- Testes novos ou atualizados quando houver regra nova.
- Documentação atualizada.
- Nenhum segredo ou dado pessoal incluído.
- Mudanças em persistência compatíveis com dados já existentes.

## 6. Limitações

Os testes automatizados não substituem testes em navegadores e dispositivos reais, testes de acessibilidade, testes de segurança, avaliação clínica nem validação do serviço remoto.

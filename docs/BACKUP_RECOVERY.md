# Backup, restauração e recuperação de dados

## 1. Escopo

O README do produto descreve exportação e importação de backup JSON pelo menu de Configurações. Os dados principais são locais ao dispositivo; por isso, backup é essencial para reduzir risco de perda ao trocar de navegador, aparelho ou limpar dados do site.

## 2. Recomendações para usuários

- Exportar backup periodicamente e antes de atualizações importantes do navegador/dispositivo.
- Guardar o arquivo em local privado e protegido.
- Não enviar o backup por canais públicos ou anexá-lo a chamados sem necessidade.
- Fazer uma exportação nova antes de importar outro arquivo.
- Não compartilhar senha do cofre protegido.
- Verificar se o arquivo restaurado contém os registros esperados.

## 3. Restauração

O fluxo de importação deve validar JSON e estrutura antes de substituir registros. A validação estrutural deve ser complementada por confirmação clara do usuário, pois a restauração pode sobrescrever dados locais atuais.

## 4. Cofre protegido

A criptografia do cofre local é distinta da exportação JSON. Não presumir que o arquivo de backup esteja criptografado só porque o cofre está ativado. Se o formato exportado não tiver criptografia própria, tratar o arquivo como dado pessoal sensível.

## 5. Recuperação técnica

- Se o navegador ainda contém dados: não limpar armazenamento/cache antes de tentar exportar backup.
- Se o cofre estiver bloqueado: solicitar a senha ao titular; não há recuperação por servidor descrita.
- Se a senha foi perdida: não prometer recuperação dos dados criptografados.
- Se a importação falhar: preservar o arquivo original e coletar apenas uma cópia sanitizada para diagnóstico.
- Se houver corrupção: não sobrescrever o armazenamento original sem antes preservar uma cópia para análise.

## 6. Pendências de engenharia

- Documentar o esquema exato e a versão do arquivo JSON exportado.
- Confirmar se a importação mescla ou substitui cada coleção.
- Adicionar versionamento explícito e migrações do backup.
- Adicionar testes de arquivo inválido, incompleto, duplicado e de versão anterior.
- Definir procedimento para backup/restore da D1, se necessário, com retenção e acesso restrito.
- Definir RPO/RTO e testar restauração; atualmente não há evidência de SLA ou plano formal de recuperação.

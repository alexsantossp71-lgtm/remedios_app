# Cofre local e armazenamento protegido

**Implementação identificada:** módulo `src/services/secureStorage` importado por `src/App.tsx`.  
**Objetivo:** oferecer proteção local opcional por senha aos registros guardados no dispositivo.

## Componentes observados

- Web Crypto API para derivação de chave e criptografia autenticada.
- PBKDF2 com SHA-256 para derivar chave a partir da senha e salt aleatório.
- AES-GCM com chave de 256 bits para cifrar o conteúdo.
- IV aleatório de 12 bytes por envelope.
- Salt aleatório de 16 bytes.
- IndexedDB para armazenar o envelope criptografado.
- Estrutura versionada com campos `version`, `kdf`, `iterations`, `salt`, `iv` e `ciphertext`.
- Dados legados são coletados das chaves de localStorage, cifrados e gravados antes da remoção das cópias legadas.

## Ciclo de vida

1. **Configuração:** exige senha com pelo menos 10 caracteres; verifica suporte a Web Crypto e IndexedDB; deriva a chave; cifra os dados atuais; grava o envelope e só então remove as cópias legadas.
2. **Desbloqueio:** lê o envelope, confere versão/KDF/iterações, deriva a chave e tenta decifrar. Senha incorreta ou envelope inválido gera erro genérico.
3. **Uso:** dados são mantidos em memória enquanto o cofre está desbloqueado. Leituras e gravações passam por funções específicas.
4. **Persistência:** gravações são serializadas por uma fila assíncrona; `flushSecureWrites` permite aguardar e detectar falha de persistência.
5. **Bloqueio:** limpa referências à chave e aos dados em memória.
6. **Desativação:** exige cofre desbloqueado, grava os dados em localStorage, remove o envelope e limpa o estado em memória. Se a gravação falhar, a proteção é mantida.

## Limites e ameaças

- A criptografia protege dados em repouso no navegador contra leitura direta do conteúdo armazenado sem a senha, dentro das premissas do dispositivo e navegador.
- Não protege contra malware, extensões maliciosas, keyloggers, captura de tela, acesso ao dispositivo já desbloqueado ou código JavaScript malicioso executado na mesma origem.
- A senha não é recuperável pelo servidor; perder a senha pode tornar o cofre irrecuperável.
- Bloquear o cofre limpa referências em memória, mas não é garantia de apagamento físico imediato da memória do processo.
- O backup exportado deve ser tratado como dado sensível; a proteção do cofre local não deve ser presumida como proteção automática do arquivo exportado.
- A segurança também depende de CSP, integridade da aplicação publicada, dependências e proteção da conta/dispositivo.

## Operação e suporte

- Orientar o usuário a escolher senha forte e guardá-la em local seguro.
- Antes de ativar ou desativar a proteção, recomendar backup atualizado.
- Não pedir nem registrar a senha em chamados, logs ou formulários.
- Testar migração, senha incorreta, armazenamento indisponível, gravação interrompida, bloqueio e restauração.

## Pendências de auditoria

- Conferir e registrar o valor exato de iterações PBKDF2 usado na constante do código.
- Revisar atomicidade e recuperação em falhas de IndexedDB.
- Confirmar se todas as chaves de dados atuais estão incluídas em `DATA_KEYS`.
- Testar comportamento com múltiplas abas abertas.
- Revisar política de timeout/bloqueio automático e exposição de dados em memória.
- Fazer revisão independente de segurança antes de alegar conformidade ou proteção certificada.

# Acessibilidade

## Objetivo

A interface deve ser utilizável por pessoas com diferentes capacidades visuais, motoras, auditivas e cognitivas, incluindo usuários que dependem de leitor de tela ou ampliação.

## Critérios recomendados

- Usar elementos HTML semânticos e rótulos associados aos campos.
- Garantir navegação completa por teclado e foco visível.
- Não comunicar estado apenas por cor.
- Manter contraste adequado em textos, botões, alertas e estados desabilitados.
- Oferecer nomes acessíveis para ícones e controles.
- Anunciar mensagens dinâmicas e erros de formulário com tecnologias assistivas.
- Respeitar zoom e tamanho de fonte do sistema.
- Evitar animações desnecessárias e respeitar preferência por movimento reduzido.
- Garantir alvos de toque confortáveis em dispositivos móveis.
- Não depender exclusivamente de áudio ou vibração para alertas críticos.
- Usar linguagem simples em mensagens, especialmente em fluxos de medicamentos.

## Testes

- Navegação somente por teclado.
- Leitor de tela em desktop e mobile.
- Zoom de 200% e reflow em telas estreitas.
- Verificação automatizada de contraste/semântica, seguida de inspeção manual.
- Teste com preferências de movimento reduzido.

## Status

Este arquivo estabelece critérios de qualidade. Não afirma que a aplicação já passou por auditoria WCAG. Registrar resultados de testes e correções em cada release.

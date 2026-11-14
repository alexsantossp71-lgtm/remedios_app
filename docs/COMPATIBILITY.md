# Compatibilidade de navegadores e dispositivos

## Plataforma

O produto é uma aplicação web React/Vite com recursos PWA. O manifesto declara exibição standalone e orientação portrait. O Service Worker utiliza Cache API, Notifications API e Push API.

## APIs de navegador utilizadas

- localStorage.
- IndexedDB.
- Web Crypto API (PBKDF2 e AES-GCM).
- Service Worker e Cache API.
- Notifications API.
- Push API / PushManager.
- Web Push com VAPID.
- APIs de data/hora e fetch.

## Implicações

- Cofre protegido exige Web Crypto e IndexedDB.
- Push exige suporte a Service Worker, PushManager e Notification, além de permissão concedida.
- Disponibilidade e comportamento de Push variam por navegador, sistema operacional, instalação PWA e políticas de economia de bateria.
- O aplicativo pode funcionar sem Push, usando os lembretes locais enquanto a aplicação está aberta/ativa, conforme implementação do cliente.
- Recursos de IA exigem conectividade e disponibilidade do proxy/provedor.

## Matriz de testes recomendada

Manter uma matriz real, atualizada por release, cobrindo:
- Chrome e Edge em Windows/Android;
- Firefox em desktop/Android;
- Safari em macOS/iOS;
- PWA instalada e aba comum;
- telas pequenas e grandes;
- modo online e offline;
- permissão de notificações concedida, negada e revogada.

Não declarar compatibilidade universal sem teste em versões específicas.

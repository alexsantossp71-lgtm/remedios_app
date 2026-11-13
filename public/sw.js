// Service Worker do "Remédio na Hora".
// Funciona em qualquer base path (/, /remedios_app/, etc.) porque usa
// registration.scope como prefixo, em vez de caminhos absolutos fixos.

const CACHE_NAME = 'remedio-na-hora-cache-v16';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Recebe Push sem expor informações clínicas na tela bloqueada.
self.addEventListener('push', (event) => {
  let message = {
    title: 'Remédio na Hora',
    body: 'Está na hora de conferir seus lembretes no aplicativo.',
  };
  if (event.data) {
    try {
      const payload = event.data.json();
      // Aceita somente a mensagem genérica prevista pelo servidor.
      if (payload && payload.title === 'Remédio na Hora' &&
          payload.body === 'Está na hora de conferir seus lembretes no aplicativo.') {
        message = payload;
      }
    } catch {
      // Ignora conteúdo não reconhecido e mantém a mensagem genérica.
    }
  }
  event.waitUntil(self.registration.showNotification(message.title, {
    body: message.body,
    icon: new URL('./icon-192.png', self.registration.scope).href,
    badge: new URL('./icon-192.png', self.registration.scope).href,
    tag: 'remedio-na-hora-dose',
    renotify: true,
    data: { url: self.registration.scope },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || self.registration.scope;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Apenas requisições same-origin e GET.
  if (
    request.method !== 'GET' ||
    new URL(request.url).origin !== self.location.origin
  ) {
    return;
  }

  // Navegações: network-first, caindo no cache (offline).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match('./index.html'))
        )
    );
    return;
  }

  // Demais assets: cache-first, atualizando o cache em background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

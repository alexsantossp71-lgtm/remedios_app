import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');

function createServiceWorkerHarness() {
    const handlers = new Map();
    const notifications = [];
    const deletedCaches = [];
    const cachedAssets = [];
    const openedWindows = [];
    const focusedClients = [];
    const navigatedClients = [];
    const cache = {
        addAll: async (assets) => cachedAssets.push(...assets),
        put: async () => {},
    };
    const self = {
        addEventListener: (name, callback) => handlers.set(name, callback),
        skipWaiting: async () => {},
        location: { origin: 'https://example.test' },
        registration: {
            scope: 'https://example.test/remedios_app/',
            showNotification: async (title, options) => notifications.push({ title, options }),
        },
        clients: {
            claim: async () => {},
            matchAll: async () => [],
            openWindow: async (url) => openedWindows.push(url),
        },
    };
    const caches = {
        open: async () => cache,
        keys: async () => ['old-cache', 'remedio-na-hora-cache-v16'],
        delete: async (name) => { deletedCaches.push(name); return true; },
        match: async () => null,
    };

    runInNewContext(source, { self, caches, URL, Promise, fetch: async () => { throw new Error('offline'); } });

    return {
        handlers,
        notifications,
        deletedCaches,
        cachedAssets,
        openedWindows,
        focusedClients,
        navigatedClients,
        self,
    };
}

test('instala o app shell no cache e ativa o Service Worker', async () => {
    const h = createServiceWorkerHarness();
    let waited;
    h.handlers.get('install')({ waitUntil: (promise) => { waited = promise; } });
    await waited;
    assert.ok(h.cachedAssets.includes('./index.html'));
    assert.ok(h.cachedAssets.includes('./manifest.webmanifest'));
});

test('remove caches antigos na ativação e assume as abas abertas', async () => {
    const h = createServiceWorkerHarness();
    let waited;
    h.handlers.get('activate')({ waitUntil: (promise) => { waited = promise; } });
    await waited;
    assert.deepEqual(h.deletedCaches, ['old-cache']);
});

test('Push inválido gera apenas uma notificação genérica, sem dados clínicos', async () => {
    const h = createServiceWorkerHarness();
    let waited;
    h.handlers.get('push')({
        data: { json: () => ({ title: 'Medicamento confidencial', body: 'Tomar 2 comprimidos' }) },
        waitUntil: (promise) => { waited = promise; },
    });
    await waited;
    assert.equal(h.notifications.length, 1);
    assert.equal(h.notifications[0].title, 'Remédio na Hora');
    assert.equal(h.notifications[0].options.body, 'Está na hora de conferir seus lembretes no aplicativo.');
    assert.equal(h.notifications[0].options.tag, 'remedio-na-hora-dose');
    assert.equal(JSON.stringify(h.notifications[0]).includes('Medicamento confidencial'), false);
});

test('Push com conteúdo permitido mantém o aviso genérico e o escopo correto', async () => {
    const h = createServiceWorkerHarness();
    let waited;
    h.handlers.get('push')({
        data: { json: () => ({
            title: 'Remédio na Hora',
            body: 'Está na hora de conferir seus lembretes no aplicativo.',
        }) },
        waitUntil: (promise) => { waited = promise; },
    });
    await waited;
    assert.equal(h.notifications[0].options.data.url, 'https://example.test/remedios_app/');
    assert.equal(h.notifications[0].options.icon, 'https://example.test/remedios_app/icon-192.png');
});

test('clique na notificação fecha o aviso e abre o aplicativo no escopo registrado', async () => {
    const h = createServiceWorkerHarness();
    let closed = false;
    let waited;
    h.handlers.get('notificationclick')({
        notification: {
            data: { url: 'https://example.test/remedios_app/' },
            close: () => { closed = true; },
        },
        waitUntil: (promise) => { waited = promise; },
    });
    await waited;
    assert.equal(closed, true);
    assert.deepEqual(h.openedWindows, ['https://example.test/remedios_app/']);
});

test('clique foca uma janela existente e a navega para o destino seguro', async () => {
    const h = createServiceWorkerHarness();
    const client = {
        focus: async () => h.focusedClients.push(true),
        navigate: async (url) => h.navigatedClients.push(url),
    };
    h.self.clients.matchAll = async () => [client];
    let waited;
    h.handlers.get('notificationclick')({
        notification: {
            data: { url: 'https://example.test/remedios_app/' },
            close: () => {},
        },
        waitUntil: (promise) => { waited = promise; },
    });
    await waited;
    assert.deepEqual(h.focusedClients, [true]);
    assert.deepEqual(h.navigatedClients, ['https://example.test/remedios_app/']);
    assert.deepEqual(h.openedWindows, []);
});

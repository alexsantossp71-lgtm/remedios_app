import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reminder } from '../types';

const TOKEN_KEY = 'remedioPushDeviceToken';
const API_BASE = 'https://remedios-ai-proxy.alexsantossp71.workers.dev';

const makeReminder = (overrides: Partial<Reminder> = {}): Reminder => ({
    id: 'reminder-private-id',
    medicationName: 'Medicamento confidencial',
    dosage: '1 comprimido',
    startDate: '2026-11-14',
    duration: { type: 'continuous', days: 0 },
    frequency: { type: 'daily', days: 1 },
    times: ['11:00'],
    history: {},
    ...overrides,
});

let values: Map<string, string>;
let requestPermission: ReturnType<typeof vi.fn>;
let getSubscription: ReturnType<typeof vi.fn>;
let subscribe: ReturnType<typeof vi.fn>;
let unsubscribe: ReturnType<typeof vi.fn>;
let fetchMock: ReturnType<typeof vi.fn>;

const installBrowserMocks = () => {
    values = new Map();
    requestPermission = vi.fn().mockResolvedValue('granted');
    unsubscribe = vi.fn().mockResolvedValue(true);
    const subscription = {
        toJSON: () => ({
            endpoint: 'https://push.example.test/subscription',
            keys: { p256dh: 'public-key', auth: 'auth-secret' },
        }),
        unsubscribe,
    };
    getSubscription = vi.fn().mockResolvedValue(subscription);
    subscribe = vi.fn().mockResolvedValue(subscription);

    vi.stubGlobal('localStorage', {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); },
        removeItem: (key: string) => { values.delete(key); },
    });
    vi.stubGlobal('navigator', {
        serviceWorker: {
            ready: Promise.resolve({
                pushManager: { getSubscription, subscribe },
            }),
            getRegistration: vi.fn().mockResolvedValue({
                pushManager: { getSubscription },
            }),
        },
    });
    vi.stubGlobal('window', { PushManager: class PushManager {} });
    vi.stubGlobal('Notification', {
        permission: 'granted',
        requestPermission,
    });
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
};

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-14T10:00:00.000Z'));
    installBrowserMocks();
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('notificações Push e agenda de doses', () => {
    it('não faz chamadas de rede quando o dispositivo não tem token', async () => {
        const { syncDoseSchedule } = await import('./pushNotifications');

        await syncDoseSchedule([makeReminder()]);

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sincroniza somente horários futuros e não envia dados clínicos', async () => {
        values.set(TOKEN_KEY, 'device-token');
        const { syncDoseSchedule } = await import('./pushNotifications');
        const reminder = makeReminder({ times: ['09:00', '11:00', '12:30'] });

        await syncDoseSchedule([reminder]);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe(`${API_BASE}/push/schedule`);
        const body = JSON.parse(String(options.body)) as { events: number[] };
        expect(body.events).toEqual([
            new Date('2026-11-14T11:00:00.000Z').getTime(),
            new Date('2026-11-14T12:30:00.000Z').getTime(),
        ]);
        expect(String(options.body)).not.toContain('Medicamento confidencial');
        expect(String(options.body)).not.toContain('1 comprimido');
        expect(String(options.body)).not.toContain(reminder.id);
    });

    it('respeita duração, frequência em intervalos e histórico de doses', async () => {
        values.set(TOKEN_KEY, 'device-token');
        const { syncDoseSchedule } = await import('./pushNotifications');
        const reminder = makeReminder({
            startDate: '2026-11-13',
            duration: { type: 'days', days: 3 },
            frequency: { type: 'interval', days: 2 },
            times: ['11:00'],
            history: { '2026-11-14': { '11:00': 'taken' } },
        });

        await syncDoseSchedule([reminder]);

        const body = JSON.parse(String(fetchMock.mock.calls[0][1].body)) as { events: number[] };
        // Dia 14: marcado como tomado. Dia 15: não corresponde ao intervalo de 2 dias.
        expect(body.events).toEqual([
            new Date('2026-11-15T11:00:00.000Z').getTime() === 0
                ? 0
                : new Date('2026-11-15T11:00:00.000Z').getTime(),
        ]);
    });

    it('limita a agenda enviada a 500 eventos ordenados e sem duplicatas', async () => {
        values.set(TOKEN_KEY, 'device-token');
        const { syncDoseSchedule } = await import('./pushNotifications');
        const times = Array.from({ length: 24 }, (_, hour) =>
            `${String(hour).padStart(2, '0')}:30`
        );
        await syncDoseSchedule([makeReminder({ times })]);

        const body = JSON.parse(String(fetchMock.mock.calls[0][1].body)) as { events: number[] };
        expect(body.events).toHaveLength(500);
        expect(body.events.every((event, index) => index === 0 || event > body.events[index - 1])).toBe(true);
    });

    it('solicita permissão, reutiliza inscrição e registra Push antes de salvar o token', async () => {
        const { enablePush, isPushEnabled } = await import('./pushNotifications');
        const order: string[] = [];
        fetchMock.mockImplementation(async (url: string) => {
            order.push(url.endsWith('/push/register') ? 'register' : 'schedule');
            return new Response(null, { status: 200 });
        });

        await enablePush([makeReminder()]);

        expect(requestPermission).not.toHaveBeenCalled();
        expect(getSubscription).toHaveBeenCalledOnce();
        expect(subscribe).not.toHaveBeenCalled();
        expect(order).toEqual(['register', 'schedule']);
        expect(isPushEnabled()).toBe(true);
        expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE}/push/register`);
        expect(fetchMock.mock.calls[0][1].headers.Authorization).toMatch(/^Bearer .+/);
    });

    it('cria uma inscrição quando ainda não existe', async () => {
        getSubscription.mockResolvedValueOnce(null);
        const { enablePush } = await import('./pushNotifications');

        await enablePush([]);

        expect(subscribe).toHaveBeenCalledOnce();
        expect(subscribe.mock.calls[0][0].userVisibleOnly).toBe(true);
        expect(fetchMock).toHaveBeenCalledWith(
            `${API_BASE}/push/register`,
            expect.objectContaining({ method: 'POST' }),
        );
    });

    it('não salva token se o servidor rejeitar o registro', async () => {
        fetchMock.mockResolvedValueOnce(new Response(
            JSON.stringify({ error: 'Serviço temporariamente indisponível' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } },
        ));
        const { enablePush, isPushEnabled } = await import('./pushNotifications');

        await expect(enablePush([])).rejects.toThrow('Serviço temporariamente indisponível');
        expect(isPushEnabled()).toBe(false);
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('interrompe a ativação quando o usuário nega a permissão', async () => {
        vi.stubGlobal('Notification', {
            permission: 'default',
            requestPermission: requestPermission.mockResolvedValue('denied'),
        });
        const { enablePush } = await import('./pushNotifications');

        await expect(enablePush([])).rejects.toThrow('Permissão de notificações não concedida.');
        expect(requestPermission).toHaveBeenCalledOnce();
        expect(getSubscription).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('informa claramente quando o navegador não oferece suporte a Push', async () => {
        vi.stubGlobal('navigator', { serviceWorker: undefined });
        const { enablePush } = await import('./pushNotifications');

        await expect(enablePush([])).rejects.toThrow('Este navegador não oferece suporte a notificações Push.');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('remove inscrição e token local ao desativar Push', async () => {
        values.set(TOKEN_KEY, 'device-token');
        const { disablePush, isPushEnabled } = await import('./pushNotifications');

        await disablePush();

        expect(fetchMock).toHaveBeenCalledWith(
            `${API_BASE}/push/unregister`,
            expect.objectContaining({ method: 'POST' }),
        );
        expect(unsubscribe).toHaveBeenCalledOnce();
        expect(isPushEnabled()).toBe(false);
    });

    it('limpa inscrição e token local mesmo se o servidor falhar ao desativar Push', async () => {
        values.set(TOKEN_KEY, 'device-token');
        fetchMock.mockRejectedValueOnce(new Error('rede indisponível'));
        const { disablePush, isPushEnabled } = await import('./pushNotifications');

        await expect(disablePush()).rejects.toThrow('rede indisponível');
        expect(unsubscribe).toHaveBeenCalledOnce();
        expect(isPushEnabled()).toBe(false);
    });
});

import type { Reminder } from '../types';

const API_BASE = 'https://remedios-ai-proxy.alexsantossp71.workers.dev';
const VAPID_PUBLIC_KEY = 'BAjbR16MfNGcHnruGzW1fhYem5k4Dk1VvxT5jj7qZjui6C5DDFnfZY_sz-EtKEgTMeHlc0OvWGtTYJAVafzGSQs';
const TOKEN_KEY = 'remedioPushDeviceToken';

const base64UrlToBytes = (value: string): Uint8Array => {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

const bytesToBase64Url = (bytes: Uint8Array): string =>
    btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const apiRequest = async (path: string, token: string, body: unknown): Promise<void> => {
    const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || 'Não foi possível configurar as notificações Push.');
    }
};

export const isPushEnabled = (): boolean => Boolean(localStorage.getItem(TOKEN_KEY));

/** Solicita consentimento e registra somente o endpoint e as chaves técnicas do navegador. */
export async function enablePush(reminders: Reminder[]): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        throw new Error('Este navegador não oferece suporte a notificações Push.');
    }
    const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Permissão de notificações não concedida.');

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY) as BufferSource,
        });
    }

    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = bytesToBase64Url(tokenBytes);
    await apiRequest('/push/register', token, { subscription: subscription.toJSON() });
    localStorage.setItem(TOKEN_KEY, token);
    await syncDoseSchedule(reminders);
}

/** Envia ao servidor apenas instantes UTC; nomes, doses e histórico permanecem no aparelho. */
export async function syncDoseSchedule(reminders: Reminder[]): Promise<void> {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const now = Date.now();
    const events: number[] = [];
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const horizon = 30;

    for (const reminder of reminders) {
        const [year, month, day] = reminder.startDate.split('-').map(Number);
        const startDate = new Date(year, month - 1, day);
        if (!Number.isFinite(startDate.getTime())) continue;

        for (let offset = 0; offset < horizon; offset += 1) {
            const dayDate = new Date(startToday);
            dayDate.setDate(dayDate.getDate() + offset);
                    const dayNumber = Date.UTC(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
            const startNumber = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const diffDays = Math.round((dayNumber - startNumber) / 86400000);
            if (diffDays < 0) continue;
            if (reminder.duration.type === 'days' && diffDays >= reminder.duration.days) continue;
            if (reminder.frequency.type === 'interval' &&
                (reminder.frequency.days < 1 || diffDays % reminder.frequency.days !== 0)) continue;

            const dateKey = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
            const dayHistory = reminder.history[dateKey] || {};
            for (const time of reminder.times) {
                if (dayHistory[time]) continue;
                const [hour, minute] = time.split(':').map(Number);
                if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) continue;
                const fireAt = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), hour, minute).getTime();
                if (fireAt > now) events.push(fireAt);
            }
        }
    }

    await apiRequest('/push/schedule', token, { events: [...new Set(events)].sort((a, b) => a - b).slice(0, 500) });
}

export async function disablePush(): Promise<void> {
    const token = localStorage.getItem(TOKEN_KEY);
    try {
        if (token) await apiRequest('/push/unregister', token, {});
    } finally {
        const registration = await navigator.serviceWorker?.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        await subscription?.unsubscribe();
        localStorage.removeItem(TOKEN_KEY);
    }
}


import { describe, it, expect } from 'vitest';
import { Reminder, ReminderStatus } from '../types';
import { computeAdherence, expectedTimesForDay } from './adherence';

// Agora fixo (16h de 12/11/2026) para testes determinísticos.
const NOW = new Date(2026, 10, 12, 16, 0, 0, 0);
const DAY_MS = 86_400_000;

const dayKey = (daysAgo: number): string => {
    const d = new Date(NOW);
    d.setDate(d.getDate() - daysAgo);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const dailyReminder = (overrides: Partial<Reminder> = {}): Reminder => ({
    id: 'r1',
    medicationName: 'Dipirona',
    startDate: dayKey(7),
    duration: { type: 'days', days: 30 },
    frequency: { type: 'daily', days: 1 },
    times: ['08:00'],
    history: {},
    createdAt: new Date(NOW.getTime() - 8 * DAY_MS).toISOString(),
    ...overrides,
});

describe('expectedTimesForDay', () => {
    it('lista os horários de um dia dentro do tratamento', () => {
        const reminder = dailyReminder();
        expect(expectedTimesForDay(reminder, NOW, NOW)).toEqual(['08:00']);
    });

    it('não conta doses futuras de hoje', () => {
        const reminder = dailyReminder({ times: ['08:00', '20:00'] });
        // 16h: 20:00 ainda não passou.
        expect(expectedTimesForDay(reminder, NOW, NOW)).toEqual(['08:00']);
    });

    it('respeita frequência em dias alternados', () => {
        const reminder = dailyReminder({ frequency: { type: 'interval', days: 2 } });
        // Começou há 7 dias: toca quando (dia - início) é par → hoje (diff 7) não toca;
        // ontem (diff 6) toca.
        expect(expectedTimesForDay(reminder, NOW, NOW)).toEqual([]);
        const yesterday = new Date(NOW); yesterday.setDate(yesterday.getDate() - 1);
        expect(expectedTimesForDay(reminder, yesterday, NOW)).toEqual(['08:00']);
    });

    it('não conta doses antes da criação do lembrete', () => {
        const createdToday = dailyReminder({ createdAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 10, 0).toISOString() });
        // Dose das 08:00 de hoje: criado às 10h → dose anterior à criação não é esperada.
        expect(expectedTimesForDay(createdToday, NOW, NOW)).toEqual([]);
    });

    it('zera depois do fim do tratamento', () => {
        const reminder = dailyReminder({ duration: { type: 'days', days: 3 } });
        const longAgo = new Date(NOW); longAgo.setDate(longAgo.getDate() - 10);
        expect(expectedTimesForDay(reminder, longAgo, NOW)).toEqual([]);
    });

    it('zera antes do início', () => {
        const reminder = dailyReminder({ startDate: dayKey(0) });
        const yesterday = new Date(NOW); yesterday.setDate(yesterday.getDate() - 1);
        expect(expectedTimesForDay(reminder, yesterday, NOW)).toEqual([]);
    });

    it('tratamento contínuo não expira', () => {
        const reminder = dailyReminder({ duration: { type: 'continuous', days: 0 }, startDate: '2020-01-01' });
        expect(expectedTimesForDay(reminder, NOW, NOW)).toEqual(['08:00']);
    });
});

describe('computeAdherence', () => {
    it('sem doses programadas: pct null', () => {
        expect(computeAdherence([], 7, NOW)).toEqual({ expected: 0, taken: 0, skipped: 0, pending: 0, pct: null });
    });

    it('conta 7 dias de dose diária e calcula a porcentagem', () => {
        const reminder = dailyReminder({ times: ['08:00', '20:00'] });
        // Janela de 7 dias: 8h e 20h de cada dia; hoje só as doses já passadas contam.
        const result = computeAdherence([reminder], 7, NOW);
        // Dias D-6..D: 6 dias completos x 2 doses = 12, hoje só 08:00 = 1 → 13.
        expect(result.expected).toBe(13);
        expect(result.taken).toBe(0);
        expect(result.pct).toBe(0);
    });

    it('doses tomadas e puladas entram separadamente', () => {
        const reminder = dailyReminder();
        reminder.history[dayKey(3)] = { '08:00': ReminderStatus.TAKEN };
        reminder.history[dayKey(2)] = { '08:00': ReminderStatus.SKIPPED };
        const result = computeAdherence([reminder], 7, NOW);
        expect(result.expected).toBe(7); // D-6..D, hoje só 08:00 (passada)
        expect(result.taken).toBe(1);
        expect(result.skipped).toBe(1);
        expect(result.pending).toBe(5);
        expect(result.pct).toBe(Math.round((1 / 7) * 100));
    });

    it('não conta doses respondidas fora da janela', () => {
        const reminder = dailyReminder();
        reminder.history[dayKey(10)] = { '08:00': ReminderStatus.TAKEN };
        const result = computeAdherence([reminder], 7, NOW);
        expect(result.taken).toBe(0);
    });

    it('lembrete encerrado dentro da janela só conta enquanto durou', () => {
        const reminder = dailyReminder({ duration: { type: 'days', days: 2 }, startDate: dayKey(4) });
        const result = computeAdherence([reminder], 7, NOW);
        // Mesma regra do alarme: doses do início até início + N dias → D-4, D-3, D-2.
        expect(result.expected).toBe(3);
    });
});

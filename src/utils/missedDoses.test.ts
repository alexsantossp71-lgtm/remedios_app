
import { describe, it, expect } from 'vitest';
import { Reminder, ReminderStatus } from '../types';
import { findMissedDoses } from './missedDoses';

// 16h de 12/11/2026.
const NOW = new Date(2026, 10, 12, 16, 0, 0, 0);
const DAY_MS = 86_400_000;

const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
    id: 'r1',
    medicationName: 'Dipirona',
    startDate: '2026-11-12', // hoje
    duration: { type: 'continuous', days: 0 },
    frequency: { type: 'daily', days: 1 },
    times: ['08:00'],
    history: {},
    ...overrides,
});

describe('findMissedDoses', () => {
    it('dose de hoje passou sem resposta: atrasada', () => {
        const list = [reminder()];
        expect(findMissedDoses(list, NOW)).toEqual([{ reminder: list[0], time: '08:00' }]);
    });

    it('dose futura de hoje não é atrasada', () => {
        expect(findMissedDoses([reminder({ times: ['20:00'] })], NOW)).toEqual([]);
    });

    it('dose já respondida não é atrasada', () => {
        const r = reminder();
        r.history['2026-11-12'] = { '08:00': ReminderStatus.TAKEN };
        expect(findMissedDoses([r], NOW)).toEqual([]);
    });

    it('dose anterior à criação do lembrete não é atrasada', () => {
        const r = reminder({ createdAt: new Date(2026, 10, 12, 10, 0).toISOString() });
        expect(findMissedDoses([r], NOW)).toEqual([]);
    });

    it('dose de outro dia (lembrete começando amanhã) não é atrasada', () => {
        expect(findMissedDoses([reminder({ startDate: '2026-11-13' })], NOW)).toEqual([]);
    });

    it('ordenada por horário', () => {
        const list = [reminder({ id: 'b', medicationName: 'Losartana', times: ['14:00'] }), reminder({ id: 'a', times: ['07:00'] })];
        expect(findMissedDoses(list, NOW).map(m => m.time)).toEqual(['07:00', '14:00']);
    });

    it('frequência alternada só cobra o dia em que toca', () => {
        // Começou ontem (diff 1): ímpar → não toca hoje (diff 1 % 2 = 1).
        const startedYesterday = reminder({ startDate: new Date(NOW.getTime() - DAY_MS).toISOString().slice(0, 10) });
        expect(findMissedDoses([reminder({ frequency: { type: 'interval', days: 2 }, startDate: startedYesterday.startDate })], NOW)).toEqual([]);
        // Começou há 2 dias: diff 2, par → toca hoje.
        const startedTwoDaysAgo = new Date(NOW.getTime() - 2 * DAY_MS);
        const pad = (n: number) => String(n).padStart(2, '0');
        const iso = `${startedTwoDaysAgo.getFullYear()}-${pad(startedTwoDaysAgo.getMonth() + 1)}-${pad(startedTwoDaysAgo.getDate())}`;
        expect(findMissedDoses([reminder({ frequency: { type: 'interval', days: 2 }, startDate: iso })], NOW).length).toBe(1);
    });
});

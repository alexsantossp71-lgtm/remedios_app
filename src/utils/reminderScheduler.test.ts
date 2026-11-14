import { describe, expect, it } from 'vitest';
import type { Reminder } from '../types';
import { getNextReminderAlarm } from './reminderScheduler';

const makeReminder = (overrides: Partial<Reminder> = {}): Reminder => ({
    id: 'reminder-1',
    medicationName: 'Medicamento de teste',
    startDate: '2026-11-14',
    duration: { type: 'continuous', days: 0 },
    frequency: { type: 'daily', days: 1 },
    times: ['11:00', '13:00'],
    history: {},
    ...overrides,
});

describe('agendamento local de lembretes', () => {
    const now = new Date('2026-11-14T10:00:00');

    it('seleciona o horário futuro mais próximo entre os lembretes', () => {
        const earlier = makeReminder({ id: 'first', times: ['12:00'] });
        const next = makeReminder({ id: 'next', times: ['10:30', '14:00'] });

        const result = getNextReminderAlarm([earlier, next], now);

        expect(result.nextAlarmTime?.getTime()).toBe(new Date('2026-11-14T10:30:00').getTime());
        expect(result.nextAlarmReminder).toEqual({ reminder: next, time: '10:30' });
    });

    it('ignora horários passados e doses já registradas no histórico', () => {
        const reminder = makeReminder({
            times: ['08:00', '10:00', '11:00', '12:00'],
            history: { '2026-11-14': { '11:00': 'taken' } },
        });

        const result = getNextReminderAlarm([reminder], now);

        expect(result.nextAlarmReminder?.time).toBe('12:00');
    });

    it('não agenda antes da data inicial nem fora do intervalo de frequência', () => {
        const notStarted = makeReminder({ startDate: '2026-11-15' });
        const everyOtherDay = makeReminder({
            startDate: '2026-11-13',
            frequency: { type: 'interval', days: 2 },
        });

        const result = getNextReminderAlarm([notStarted, everyOtherDay], now);

        expect(result.nextAlarmTime).toBeNull();
        expect(result.nextAlarmReminder).toBeNull();
    });

    it('respeita o fim da duração cadastrada', () => {
        const expired = makeReminder({
            startDate: '2026-11-13',
            duration: { type: 'days', days: 1 },
        });

        expect(getNextReminderAlarm([expired], now).nextAlarmTime).toBeNull();
    });

    it('mantém o lembrete ativo até o limite da duração', () => {
        const active = makeReminder({
            startDate: '2026-11-13',
            duration: { type: 'days', days: 2 },
            times: ['11:00'],
        });

        expect(getNextReminderAlarm([active], now).nextAlarmReminder?.time).toBe('11:00');
    });

    it('ignora data inicial e horários inválidos sem quebrar os demais lembretes', () => {
        const invalid = makeReminder({ startDate: '2026-02-30', times: ['99:99'] });
        const valid = makeReminder({ id: 'valid', times: ['11:30'] });

        const result = getNextReminderAlarm([invalid, valid], now);

        expect(result.nextAlarmReminder).toEqual({ reminder: valid, time: '11:30' });
    });

    it('não dispara quando todos os horários do dia já passaram ou foram respondidos', () => {
        const reminder = makeReminder({
            times: ['08:00', '09:30'],
            history: { '2026-11-14': { '09:30': 'skipped' } },
        });

        expect(getNextReminderAlarm([reminder], now).nextAlarmTime).toBeNull();
    });
});

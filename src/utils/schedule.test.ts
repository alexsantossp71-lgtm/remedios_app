import { describe, expect, it } from 'vitest';
import { ReminderStatus, type Reminder } from '../types';
import { combineDateAndTime } from './date';
import {
  getAdherenceSummary,
  getDoseState,
  getDosesForDate,
  getNextDose,
  getOccurrencesBetween,
  isReminderScheduledOn,
  makeOccurrence,
} from './schedule';

const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: 'reminder-1',
  medicationName: 'Medicamento teste',
  dosage: '1 comprimido',
  instructions: '',
  startDate: '2026-08-07',
  duration: { type: 'continuous', days: 0 },
  frequency: { type: 'daily', days: 1 },
  times: ['08:00', '20:00'],
  history: {},
  enabled: true,
  createdAt: '2026-08-07T12:00:00.000Z',
  ...overrides,
});

describe('recorrência de lembretes', () => {
  it('respeita início e duração inclusiva em quantidade de dias', () => {
    const sevenDays = reminder({ duration: { type: 'days', days: 7 } });
    expect(isReminderScheduledOn(sevenDays, '2026-08-06')).toBe(false);
    expect(isReminderScheduledOn(sevenDays, '2026-08-07')).toBe(true);
    expect(isReminderScheduledOn(sevenDays, '2026-08-13')).toBe(true);
    expect(isReminderScheduledOn(sevenDays, '2026-08-14')).toBe(false);
  });

  it('agenda intervalos a partir da data inicial', () => {
    const everyTwoDays = reminder({ frequency: { type: 'interval', days: 2 } });
    expect(isReminderScheduledOn(everyTwoDays, '2026-08-07')).toBe(true);
    expect(isReminderScheduledOn(everyTwoDays, '2026-08-08')).toBe(false);
    expect(isReminderScheduledOn(everyTwoDays, '2026-08-09')).toBe(true);
  });

  it('não agenda lembretes pausados', () => {
    expect(isReminderScheduledOn(reminder({ enabled: false }), '2026-08-07')).toBe(false);
  });

  it('gera todas as doses do dia em ordem cronológica', () => {
    const doses = getDosesForDate([reminder({ times: ['20:00', '08:00', '12:30'] })], '2026-08-07');
    expect(doses.map((dose) => dose.time)).toEqual(['08:00', '12:30', '20:00']);
  });

  it('encontra a próxima dose no dia seguinte após o último horário de hoje', () => {
    const next = getNextDose([reminder()], combineDateAndTime('2026-08-07', '21:00'));
    expect(next?.date).toBe('2026-08-08');
    expect(next?.time).toBe('08:00');
  });

  it('encontra lembretes cuja data inicial ainda está no futuro', () => {
    const next = getNextDose(
      [reminder({ startDate: '2027-01-10', times: ['09:15'] })],
      combineDateAndTime('2026-08-07', '10:00'),
    );
    expect(next?.date).toBe('2027-01-10');
    expect(next?.time).toBe('09:15');
  });

  it('ignora doses já tratadas ao procurar a próxima', () => {
    const withHistory = reminder({
      history: { '2026-08-07': { '08:00': ReminderStatus.TAKEN } },
    });
    const next = getNextDose([withHistory], combineDateAndTime('2026-08-07', '07:00'));
    expect(next?.time).toBe('20:00');
  });

  it('inclui alarmes simultâneos de lembretes diferentes', () => {
    const second = reminder({ id: 'reminder-2', medicationName: 'Outro medicamento' });
    const occurrences = getOccurrencesBetween(
      [reminder(), second],
      combineDateAndTime('2026-08-07', '07:59'),
      combineDateAndTime('2026-08-07', '08:01'),
    );
    expect(occurrences).toHaveLength(2);
    expect(new Set(occurrences.map((item) => item.reminderId))).toEqual(
      new Set(['reminder-1', 'reminder-2']),
    );
  });
});

describe('estado e acompanhamento de doses', () => {
  it('classifica doses futuras, devidas, atrasadas, tomadas e ignoradas', () => {
    const base = reminder({ times: ['08:00'] });
    const occurrence = makeOccurrence(base, '2026-08-07', '08:00');
    expect(getDoseState(occurrence, base, combineDateAndTime('2026-08-07', '07:00'))).toBe('upcoming');
    expect(getDoseState(occurrence, base, combineDateAndTime('2026-08-07', '08:10'))).toBe('due');
    expect(getDoseState(occurrence, base, combineDateAndTime('2026-08-07', '09:00'))).toBe('missed');

    const taken = reminder({
      times: ['08:00'],
      history: { '2026-08-07': { '08:00': ReminderStatus.TAKEN } },
    });
    expect(getDoseState(occurrence, taken, combineDateAndTime('2026-08-07', '09:00'))).toBe(
      ReminderStatus.TAKEN,
    );
  });

  it('calcula adesão apenas sobre ocorrências já vencidas', () => {
    const tracked = reminder({
      times: ['08:00', '20:00'],
      history: { '2026-08-07': { '08:00': ReminderStatus.TAKEN } },
    });
    const summary = getAdherenceSummary(
      [tracked],
      combineDateAndTime('2026-08-07', '00:00'),
      combineDateAndTime('2026-08-07', '23:59'),
      combineDateAndTime('2026-08-07', '12:00'),
    );
    expect(summary).toEqual({ total: 1, taken: 1, skipped: 0, missed: 0, percentage: 100 });
  });
});

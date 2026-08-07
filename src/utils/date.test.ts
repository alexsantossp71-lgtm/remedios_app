import { describe, expect, it } from 'vitest';
import {
  addDaysToKey,
  combineDateAndTime,
  differenceInCalendarDays,
  isValidDateKey,
  isValidTime,
  parseLocalDate,
  toDateKey,
} from './date';

describe('utilitários de data local', () => {
  it('interpreta YYYY-MM-DD como calendário local, sem deslocar o dia', () => {
    const date = parseLocalDate('2026-08-07');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(7);
    expect(toDateKey(date)).toBe('2026-08-07');
  });

  it('combina a data e o horário no fuso local', () => {
    const date = combineDateAndTime('2026-08-07', '08:35');
    expect(toDateKey(date)).toBe('2026-08-07');
    expect(date.getHours()).toBe(8);
    expect(date.getMinutes()).toBe(35);
  });

  it('soma dias de calendário entre meses e anos', () => {
    expect(addDaysToKey('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDaysToKey('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('calcula diferença por dias de calendário, não por duração com horário de verão', () => {
    expect(
      differenceInCalendarDays(parseLocalDate('2026-11-02'), parseLocalDate('2026-10-31')),
    ).toBe(2);
  });

  it('valida datas e horários reais', () => {
    expect(isValidDateKey('2026-02-28')).toBe(true);
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('07/08/2026')).toBe(false);
    expect(isValidTime('23:59')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('8:00')).toBe(false);
  });
});

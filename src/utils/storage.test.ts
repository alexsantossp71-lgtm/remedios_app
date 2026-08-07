import { describe, expect, it } from 'vitest';
import { ReminderStatus } from '../types';
import {
  createEmptyAppData,
  importAppData,
  normalizeAppData,
  normalizeReminder,
} from './storage';

describe('normalização e migração dos dados', () => {
  it('migra um lembrete do formato legado', () => {
    const migrated = normalizeAppData([
      {
        id: 'old-1',
        medicationName: 'Losartana',
        startDate: '2026-08-07',
        duration: { type: 'days', days: 30 },
        frequency: { type: 'daily', days: 1 },
        times: ['20:00', '08:00'],
        history: { '2026-08-07': { '08:00': 'taken' } },
      },
    ]);

    expect(migrated.version).toBe(2);
    expect(migrated.reminders).toHaveLength(1);
    expect(migrated.reminders[0]).toMatchObject({
      id: 'old-1',
      medicationName: 'Losartana',
      dosage: '',
      enabled: true,
      times: ['08:00', '20:00'],
    });
    expect(migrated.reminders[0].history['2026-08-07']['08:00']).toBe(ReminderStatus.TAKEN);
  });

  it('remove horários inválidos e duplicados sem deixar o lembrete sem horário', () => {
    const normalized = normalizeReminder({
      medicationName: 'Teste',
      startDate: '2026-08-07',
      times: ['08:00', '08:00', '25:00', null],
    });
    expect(normalized?.times).toEqual(['08:00']);

    const withNoValidTime = normalizeReminder({ medicationName: 'Teste', times: ['99:99'] });
    expect(withNoValidTime?.times).toEqual(['08:00']);
  });

  it('limita números fora da faixa e corrige datas inválidas', () => {
    const normalized = normalizeReminder({
      medicationName: 'Teste',
      startDate: '2026-02-30',
      duration: { type: 'days', days: -10 },
      frequency: { type: 'interval', days: 9999 },
      times: ['10:00'],
    });
    expect(normalized?.duration.days).toBe(1);
    expect(normalized?.frequency.days).toBe(365);
    expect(normalized?.startDate).not.toBe('2026-02-30');
  });

  it('ignora entradas sem nome de medicamento', () => {
    expect(normalizeReminder({ medicationName: '   ', times: ['08:00'] })).toBeNull();
    expect(normalizeAppData({ reminders: [{ foo: 'bar' }] }).reminders).toEqual([]);
  });

  it('rejeita arquivos JSON que não são cópias do aplicativo', () => {
    expect(() => importAppData('{"foo":"bar"}')).toThrow('Formato de cópia inválido');
    expect(() => importAppData('não é json')).toThrow();
  });

  it('cria configurações independentes para cada estado vazio', () => {
    const first = createEmptyAppData();
    const second = createEmptyAppData();
    first.settings.theme = 'dark';
    expect(second.settings.theme).toBe('system');
  });
});

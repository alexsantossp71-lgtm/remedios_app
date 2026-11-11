
import { describe, it, expect } from 'vitest';
import {
    sanitizePrescriptionEntries,
    entryToReminderDraft,
    draftsFromPrescription,
    spreadTimes,
    describeDraft,
    type PrescriptionEntry,
} from './prescription';

const TODAY = '2026-01-10';

const rawEntry = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    medicationName: 'Dipirona',
    dosage: '1 comprimido',
    instructions: 'com alimentos',
    durationDays: 7,
    intervalHours: 0,
    timesPerDay: 0,
    times: [],
    startDate: '',
    ...overrides,
});

const validEntry = (overrides: Partial<PrescriptionEntry> = {}): PrescriptionEntry => ({
    medicationName: 'Dipirona',
    dosage: '1 comprimido',
    instructions: '',
    durationDays: 7,
    intervalHours: 0,
    timesPerDay: 0,
    times: [],
    startDate: '',
    ...overrides,
});

describe('sanitizePrescriptionEntries', () => {
    it('devolve lista vazia para entradas inesperadas', () => {
        expect(sanitizePrescriptionEntries(null)).toEqual([]);
        expect(sanitizePrescriptionEntries('texto')).toEqual([]);
        expect(sanitizePrescriptionEntries({ medicamentos: [] })).toEqual([]);
        expect(sanitizePrescriptionEntries([null, 42, 'x'])).toEqual([]);
    });

    it('descarta itens sem nome de medicamento', () => {
        const entries = sanitizePrescriptionEntries([
            rawEntry({ medicationName: '' }),
            rawEntry({ medicationName: '   ' }),
            rawEntry(),
        ]);
        expect(entries).toHaveLength(1);
        expect(entries[0].medicationName).toBe('Dipirona');
    });

    it('coage números escritos como texto e limita valores', () => {
        const entries = sanitizePrescriptionEntries([
            rawEntry({ durationDays: '5', intervalHours: '8', timesPerDay: '3' }),
        ]);
        expect(entries[0].durationDays).toBe(5);
        expect(entries[0].intervalHours).toBe(8);
        expect(entries[0].timesPerDay).toBe(3);
    });

    it('normaliza horários, remove inválidos e duplicados', () => {
        const entries = sanitizePrescriptionEntries([
            rawEntry({ times: ['7:05', '07:05', '25:00', '12:60', 'x', '23:00'] }),
        ]);
        expect(entries[0].times).toEqual(['07:05', '23:00']);
    });

    it('descarta data inválida e mantém a válida', () => {
        const entries = sanitizePrescriptionEntries([
            rawEntry({ startDate: '2026-02-30' }),
            rawEntry({ startDate: '2026-03-05' }),
            rawEntry({ startDate: 'sem data' }),
        ]);
        expect(entries[0].startDate).toBe('');
        expect(entries[1].startDate).toBe('2026-03-05');
        expect(entries[2].startDate).toBe('');
    });

    it('limita a lista a 15 medicamentos', () => {
        const many = Array.from({ length: 30 }, () => rawEntry({ medicationName: 'Med' }));
        expect(sanitizePrescriptionEntries(many)).toHaveLength(15);
    });
});

describe('spreadTimes', () => {
    it('distribui doses a partir das 08:00', () => {
        expect(spreadTimes('08:00', 8, 3)).toEqual(['00:00', '08:00', '16:00']);
    });

    it('usa 08:00 quando o horário inicial é inválido e evita duplicatas', () => {
        expect(spreadTimes('zz', 12, 3)).toEqual(['08:00', '20:00']);
        expect(spreadTimes('8:0', 12, 2)).toEqual(['08:00', '20:00']);
    });

    it('passo de 12h com 2 doses', () => {
        expect(spreadTimes('08:00', 12, 2)).toEqual(['08:00', '20:00']);
    });
});

describe('entryToReminderDraft', () => {
    it('"8/8h por 7 dias" vira diário com 3 doses distribuídas', () => {
        const draft = entryToReminderDraft(validEntry({ intervalHours: 8 }), TODAY);
        expect(draft).not.toBeNull();
        expect(draft!.frequency).toEqual({ type: 'daily', days: 1 });
        expect(draft!.duration).toEqual({ type: 'days', days: 7 });
        expect(draft!.times).toEqual(['00:00', '08:00', '16:00']);
        expect(draft!.startDate).toBe(TODAY);
    });

    it('intervalo de 48h vira frequência "a cada 2 dias" com 1 dose', () => {
        const draft = entryToReminderDraft(validEntry({ intervalHours: 48, durationDays: 0 }), TODAY);
        expect(draft!.frequency).toEqual({ type: 'interval', days: 2 });
        expect(draft!.times).toEqual(['08:00']);
        expect(draft!.duration).toEqual({ type: 'continuous', days: 0 });
    });

    it('"3x ao dia" vira diário com 3 doses igualmente espaçadas', () => {
        const draft = entryToReminderDraft(validEntry({ timesPerDay: 3 }), TODAY);
        expect(draft!.times).toEqual(['00:00', '08:00', '16:00']);
        expect(draft!.frequency.type).toBe('daily');
    });

    it('"2x ao dia" vira 08:00 e 20:00', () => {
        const draft = entryToReminderDraft(validEntry({ timesPerDay: 2 }), TODAY);
        expect(draft!.times).toEqual(['08:00', '20:00']);
    });

    it('horários explícitos da receita são usados como estão', () => {
        const draft = entryToReminderDraft(validEntry({ times: ['07:30', '22:00'] }), TODAY);
        expect(draft!.times).toEqual(['07:30', '22:00']);
    });

    it('horário explícito com intervalo de dias mantém frequência por dias', () => {
        const draft = entryToReminderDraft(validEntry({ times: ['07:00'], intervalHours: 48 }), TODAY);
        expect(draft!.frequency).toEqual({ type: 'interval', days: 2 });
        expect(draft!.times).toEqual(['07:00']);
    });

    it('sem posologia nenhuma: diário às 08:00, uso contínuo', () => {
        const draft = entryToReminderDraft(validEntry({ durationDays: 0 }), TODAY);
        expect(draft!.times).toEqual(['08:00']);
        expect(draft!.duration).toEqual({ type: 'continuous', days: 0 });
        expect(draft!.frequency).toEqual({ type: 'daily', days: 1 });
    });

    it('data da receita prevalece sobre a padrão; inválida cai na padrão', () => {
        const draft = entryToReminderDraft(validEntry({ startDate: '2026-02-01' }), TODAY);
        expect(draft!.startDate).toBe('2026-02-01');
        const draft2 = entryToReminderDraft(validEntry({ startDate: '2026-02-30' }), TODAY);
        expect(draft2!.startDate).toBe(TODAY);
    });

    it('devolve null sem nome e mantém dosage/instructions', () => {
        expect(entryToReminderDraft(validEntry({ medicationName: '' }), TODAY)).toBeNull();
        const draft = entryToReminderDraft(validEntry({ dosage: '5 ml', instructions: 'em jejum' }), TODAY);
        expect(draft!.dosage).toBe('5 ml');
        expect(draft!.instructions).toBe('em jejum');
    });
});

describe('draftsFromPrescription', () => {
    it('descarta entradas inválidas e converte o restante', () => {
        const drafts = draftsFromPrescription(
            [validEntry({ medicationName: 'Losartana', timesPerDay: 1 }), validEntry({ medicationName: '' })],
            TODAY
        );
        expect(drafts).toHaveLength(1);
        expect(drafts[0].medicationName).toBe('Losartana');
        expect(drafts[0].times).toEqual(['08:00']);
    });
});

describe('describeDraft', () => {
    it('resume duração, frequência, horários e data em português', () => {
        const draft = entryToReminderDraft(
            validEntry({ medicationName: 'Losartana', durationDays: 30, timesPerDay: 1 }),
            '2026-01-10'
        );
        expect(describeDraft(draft!)).toBe('Por 30 dia(s) · todos os dias · 08:00 · início 10/01/2026');
    });

    it('descreve uso contínuo e frequência por dias', () => {
        const draft = entryToReminderDraft(
            validEntry({ medicationName: 'Metformina', intervalHours: 48, durationDays: 0 }),
            '2026-01-10'
        );
        expect(describeDraft(draft!)).toBe('Uso contínuo · a cada 2 dia(s) · 08:00 · início 10/01/2026');
    });
});

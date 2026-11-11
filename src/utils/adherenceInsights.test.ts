
import { describe, it, expect } from 'vitest';
import { Reminder, ReminderStatus } from '../types';
import {
    buildAdherenceReport,
    describeWindow,
    reportFingerprint,
    sanitizeAdherenceAnalysis,
} from './adherenceInsights';

const NOW = new Date(2026, 10, 12, 16, 0, 0, 0); // 16h de 12/11/2026 (quinta)
const DAY_MS = 86_400_000;

const dayKey = (daysAgo: number): string => {
    const d = new Date(NOW);
    d.setDate(d.getDate() - daysAgo);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
    id: 'r1',
    medicationName: 'Dipirona',
    startDate: dayKey(7),
    duration: { type: 'days', days: 30 },
    frequency: { type: 'daily', days: 1 },
    times: ['08:00', '22:00'],
    history: {},
    createdAt: new Date(NOW.getTime() - 8 * DAY_MS).toISOString(),
    ...overrides,
});

/** Marca todas as doses das 08:00 dos últimos 7 dias como tomadas. */
const takenMornings = (): Reminder['history'] => {
    const history: Reminder['history'] = {};
    for (let i = 0; i < 7; i++) history[dayKey(i)] = { '08:00': ReminderStatus.TAKEN };
    return history;
};

describe('buildAdherenceReport', () => {
    it('agrega as perdas por faixa de horário', () => {
        const report = buildAdherenceReport([reminder({ history: takenMornings() })], NOW);
        expect(report.last7.expected).toBe(13); // 6 dias x 2 doses + 08:00 de hoje
        expect(report.last7.taken).toBe(7);
        expect(report.last7.missed).toBe(6);
        expect(report.last7.byTime).toEqual([
            { label: 'Noite (18h–23h)', missed: 6, expected: 6 },
        ]);
        expect(report.last7.byTime[0].label).toContain('Noite');
    });

    it('não inclui grupos sem perda', () => {
        const report = buildAdherenceReport([reminder({ history: takenMornings() })], NOW);
        const labels = report.last7.byTime.map((g) => g.label);
        expect(labels).not.toContain('Manhã (6h–11h)');
    });

    it('agrega por medicamento', () => {
        const report = buildAdherenceReport([reminder({ history: takenMornings() })], NOW);
        expect(report.last7.byMedication[0]).toEqual({ label: 'Dipirona', missed: 6, expected: 6 });
    });

    it('analisa por dia da semana apenas na janela de 30 dias', () => {
        const report = buildAdherenceReport([reminder({ history: takenMornings() })], NOW);
        expect(report.last7.byWeekday).toEqual([]);
        // 30 dias cobrem 8 dias de histórico (D-7..D): 15 doses esperadas,
        // 7 tomadas → 8 perdidas, todas às 22:00.
        const weekdayMisses = report.last30.byWeekday.reduce((sum, g) => sum + g.missed, 0);
        expect(weekdayMisses).toBe(8);
        const valid = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
        report.last30.byWeekday.forEach((g) => expect(valid).toContain(g.label));
    });

    it('relatório vazio quando nada está programado', () => {
        const report = buildAdherenceReport([], NOW);
        expect(report.last7.expected).toBe(0);
        expect(report.last30.expected).toBe(0);
        expect(report.last7.byTime).toEqual([]);
    });
});

describe('describeWindow', () => {
    it('descreve a janela com porcentagem e contagens', () => {
        const report = buildAdherenceReport([reminder({ history: takenMornings() })], NOW);
        expect(describeWindow(report.last7)).toBe(`54% (7 de 13)`);
    });

    it('sem doses programadas', () => {
        expect(describeWindow(buildAdherenceReport([], NOW).last7)).toBe('sem doses programadas');
    });
});

describe('reportFingerprint', () => {
    it('estável para o mesmo histórico', () => {
        const a = reportFingerprint(buildAdherenceReport([reminder()], NOW));
        const b = reportFingerprint(buildAdherenceReport([reminder()], NOW));
        expect(a).toBe(b);
    });

    it('muda quando o histórico muda (cache não mostra análise velha)', () => {
        const a = reportFingerprint(buildAdherenceReport([reminder()], NOW));
        const b = reportFingerprint(buildAdherenceReport([reminder({ history: takenMornings() })], NOW));
        expect(a).not.toBe(b);
    });
});

describe('sanitizeAdherenceAnalysis', () => {
    it('normaliza uma análise válida', () => {
        const result = sanitizeAdherenceAnalysis({
            summary: 'Adesão com espaço para melhorar.',
            insights: [
                { title: 'Você perde mais a dose das 22h', detail: '6 doses da noite não foram tomadas.', suggestion: 'Ajuste o alarme para 21h30.' },
                { junk: true }, // sem title nem detail → descartado
            ],
        });
        expect(result.summary).toBe('Adesão com espaço para melhorar.');
        expect(result.insights).toHaveLength(1);
        expect(result.insights[0].suggestion).toBe('Ajuste o alarme para 21h30.');
    });

    it('nunca lança: entrada estranha vira análise vazia', () => {
        expect(sanitizeAdherenceAnalysis('não sou json')).toEqual({ summary: '', insights: [] });
        expect(sanitizeAdherenceAnalysis(null)).toEqual({ summary: '', insights: [] });
        expect(sanitizeAdherenceAnalysis({ insights: 'não é lista' })).toEqual({ summary: '', insights: [] });
    });

    it('limita a 6 insights', () => {
        const many = Array.from({ length: 10 }, (_, i) => ({ title: `Insight ${i}`, detail: 'x', suggestion: 'y' }));
        expect(sanitizeAdherenceAnalysis({ insights: many }).insights).toHaveLength(6);
    });
});

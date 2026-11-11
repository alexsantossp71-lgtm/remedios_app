
import { describe, it, expect } from 'vitest';
import { LabResult } from '../types';
import {
    computeTrends,
    describeTrend,
    flagOf,
    normalizeExamName,
    parseNumericValue,
    parseReferenceText,
    sanitizeLabScan,
} from './labResults';

describe('parseNumericValue', () => {
    it('lê inteiros e decimais brasileiros', () => {
        expect(parseNumericValue('95')).toBe(95);
        expect(parseNumericValue('5,4')).toBe(5.4);
        expect(parseNumericValue('5.4')).toBe(5.4);
        expect(parseNumericValue('0,9')).toBe(0.9);
    });

    it('lê ponto como separador de milhar quando agrupa de 3 em 3', () => {
        expect(parseNumericValue('10.200')).toBe(10200);
        expect(parseNumericValue('10.200,45')).toBe(10200.45);
        expect(parseNumericValue('4.500')).toBe(4500);
    });

    it('valor não numérico vira null', () => {
        expect(parseNumericValue('')).toBeNull();
        expect(parseNumericValue('negativo')).toBeNull();
    });
});

describe('parseReferenceText', () => {
    it('lê faixas com hífen, "a" e "e"', () => {
        expect(parseReferenceText('70 - 99')).toEqual({ low: 70, high: 99 });
        expect(parseReferenceText('70 a 99')).toEqual({ low: 70, high: 99 });
        expect(parseReferenceText('entre 4,0 e 5,6')).toEqual({ low: 4, high: 5.6 });
        expect(parseReferenceText('0,9-1,3')).toEqual({ low: 0.9, high: 1.3 });
    });

    it('lê limites abertos', () => {
        expect(parseReferenceText('até 100')).toEqual({ low: null, high: 100 });
        expect(parseReferenceText('< 100')).toEqual({ low: null, high: 100 });
        expect(parseReferenceText('≥ 4,0')).toEqual({ low: 4, high: null });
        expect(parseReferenceText('> 4,0')).toEqual({ low: 4, high: null });
    });

    it('faixa ilegível vira null/null', () => {
        expect(parseReferenceText('')).toEqual({ low: null, high: null });
        expect(parseReferenceText('ver laudo')).toEqual({ low: null, high: null });
    });
});

describe('flagOf', () => {
    it('compara com a faixa (cálculo do app, nunca da IA)', () => {
        expect(flagOf(95, 70, 99)).toBe('normal');
        expect(flagOf(110, 70, 99)).toBe('high');
        expect(flagOf(60, 70, 99)).toBe('low');
        expect(flagOf(null, 70, 99)).toBe('');
        expect(flagOf(95, null, null)).toBe('');
        // Faixa só com limite superior
        expect(flagOf(150, null, 100)).toBe('high');
        expect(flagOf(90, null, 100)).toBe('normal');
    });
});

describe('sanitizeLabScan', () => {
    it('normaliza a resposta da IA e calcula as marcações', () => {
        const result = sanitizeLabScan({
            labName: 'Laboratório Analisa',
            examDate: '2026-11-10',
            resultados: [
                { examName: 'Glicemia', value: '95', unit: 'mg/dL', reference: '70 - 99' },
                { examName: 'Hemoglobina', value: '10,2', unit: 'g/dL', reference: '12 - 16' },
                { examName: 'Hematócrito', value: '52', unit: '%', reference: '36 - 48' },
                { examName: '', value: '50', unit: '', reference: '' }, // sem nome → descartado
            ],
        });
        expect(result.labName).toBe('Laboratório Analisa');
        expect(result.examDate).toBe('2026-11-10');
        expect(result.values).toHaveLength(3);
        expect(result.values[0].flag).toBe('normal');
        expect(result.values[1].flag).toBe('low');
        expect(result.values[2].flag).toBe('high');
    });

    it('nunca lança; entrada estranha vira laudo vazio', () => {
        expect(sanitizeLabScan('lixo')).toEqual({ labName: '', examDate: '', values: [] });
        expect(sanitizeLabScan(null).values).toEqual([]);
    });

    it('data inválida é descartada', () => {
        const result = sanitizeLabScan({ labName: 'X', examDate: '10/11/2026', resultados: [] });
        expect(result.examDate).toBe('');
    });
});

describe('normalizeExamName', () => {
    it('ignora maiúsculas, acentos e espaços extras', () => {
        expect(normalizeExamName('GLICEMIA Em Jejum')).toBe('glicemia em jejum');
        expect(normalizeExamName('Glicose  ')).toBe('glicose');
        expect(normalizeExamName('TSH')).toBe('tsh');
    });
});

const lab = (overrides: Partial<LabResult> = {}): LabResult => ({
    id: 'l1',
    date: '2026-03-12',
    labName: 'Lab A',
    values: [],
    notes: '',
    createdAt: new Date(2026, 2, 12).toISOString(),
    ...overrides,
});

describe('computeTrends', () => {
    it('agrupa exames repetidos e calcula a variação (normalizando o nome)', () => {
        const trends = computeTrends([
            lab({
                date: '2026-03-12',
                values: [{ examName: 'Glicemia', valueText: '95', numericValue: 95, unit: 'mg/dL', referenceLow: 70, referenceHigh: 99, referenceText: '70-99', flag: 'normal' }],
            }),
            lab({
                date: '2026-11-10',
                values: [{ examName: 'GLICEMIA', valueText: '110', numericValue: 110, unit: 'mg/dL', referenceLow: 70, referenceHigh: 99, referenceText: '70-99', flag: 'high' }],
            }),
        ]);
        expect(trends).toHaveLength(1);
        const trend = trends[0];
        expect(trend.entries).toHaveLength(2);
        expect(trend.pctChange).toBe(16);
        expect(trend.direction).toBe('up');
        expect(trend.last?.value).toBe(110);
    });

    it('nomes diferentes não são agrupados por semelhança (evita misturar exames)', () => {
        const value = (name: string, v: number) => ({ examName: name, valueText: String(v), numericValue: v, unit: '', referenceLow: null, referenceHigh: null, referenceText: '', flag: '' as const });
        const trends = computeTrends([
            lab({ date: '2026-03-12', values: [value('Glicemia', 95)] }),
            lab({ date: '2026-11-10', values: [value('Glicemia em jejum', 110)] }),
        ]);
        expect(trends).toHaveLength(0);
    });

    it('exame com um único resultado não entra na evolução', () => {
        const trends = computeTrends([
            lab({ values: [{ examName: 'TSH', valueText: '2,1', numericValue: 2.1, unit: 'mUI/L', referenceLow: 0.4, referenceHigh: 4, referenceText: '0,4-4', flag: 'normal' }] }),
        ]);
        expect(trends).toHaveLength(0);
    });

    it('variação pequena é estável', () => {
        const value = (v: number) => ({ examName: 'Glicemia', valueText: String(v), numericValue: v, unit: '', referenceLow: null, referenceHigh: null, referenceText: '', flag: '' as const });
        const trends = computeTrends([
            lab({ date: '2026-01-01', values: [value(100)] }),
            lab({ date: '2026-02-01', values: [value(101)] }),
        ]);
        expect(trends[0].direction).toBe('stable');
    });
});

describe('describeTrend', () => {
    it('resume a evolução em português', () => {
        const [trend] = computeTrends([
            lab({ date: '2026-03-12', values: [{ examName: 'Glicemia', valueText: '95', numericValue: 95, unit: 'mg/dL', referenceLow: null, referenceHigh: null, referenceText: '', flag: '' }] }),
            lab({ date: '2026-11-10', values: [{ examName: 'Glicemia', valueText: '110', numericValue: 110, unit: 'mg/dL', referenceLow: null, referenceHigh: null, referenceText: '', flag: '' }] }),
        ]);
        const text = describeTrend(trend);
        expect(text).toContain('Glicemia: 95 → 110 mg/dL');
        expect(text).toContain('subiu ~16%');
        expect(text).toContain('12/03/2026');
        expect(text).toContain('10/11/2026');
    });
});

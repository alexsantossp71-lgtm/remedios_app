
import { describe, it, expect } from 'vitest';
import {
    AiError,
    extractJson,
    sanitizeInteractionReport,
    sanitizeMedicationGuide,
} from './nvidiaService';

describe('extractJson', () => {
    it('extrai JSON puro', () => {
        expect(extractJson('{"a":1}')).toEqual({ a: 1 });
        expect(extractJson('{}')).toEqual({});
    });

    it('extrai JSON de blocos de código markdown', () => {
        expect(extractJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
        expect(extractJson('```\n{"a": 1}\n```')).toEqual({ a: 1 });
    });

    it('extrai JSON com texto ao redor (respostas conversacionais)', () => {
        expect(extractJson('Claro! Aqui estão os dados: {"nome":"Dipirona"} — qualquer dúvida me avise.')).toEqual({
            nome: 'Dipirona',
        });
    });

    it('suporta objetos aninhados e arrays', () => {
        const text = '{"exames":[{"nome":"Hemograma","data":"2026-11-11"}],"total":1}';
        expect(extractJson(text)).toEqual({ exames: [{ nome: 'Hemograma', data: '2026-11-11' }], total: 1 });
    });

    it('usa o primeiro { e o último } (campos com chaves no conteúdo)', () => {
        expect(extractJson('{"a":"}","b":"{"}')).toEqual({ a: '}', b: '{' });
    });

    it('lança AiError sem mensagem legível quando não há JSON', () => {
        expect(() => extractJson('lorem ipsum sem objeto')).toThrow(AiError);
    });

    it('lança AiError para JSON malformado', () => {
        expect(() => extractJson('{"a":1')).toThrow(AiError);
        expect(() => extractJson('{a:1}')).toThrow(AiError);
    });
});

describe('sanitizeInteractionReport', () => {
    it('devolve relatório vazio para entradas inesperadas', () => {
        expect(sanitizeInteractionReport(null)).toEqual({ summary: '', duplicates: [], interactions: [], sources: [] });
        expect(sanitizeInteractionReport('texto')).toEqual({ summary: '', duplicates: [], interactions: [], sources: [] });
        expect(sanitizeInteractionReport([1, 2, 3])).toEqual({ summary: '', duplicates: [], interactions: [], sources: [] });
    });

    it('normaliza relatório completo da IA', () => {
        const report = sanitizeInteractionReport({
            summary: ' Dois alertas encontrados. ',
            duplicates: [
                { activeIngredient: 'Dipirona', medications: ['Dipirona', 'Novalgina'], note: 'Risco de dose dupla.' },
                { activeIngredient: '', medications: ['Sem nome'] }, // descartado
            ],
            interactions: [
                {
                    severity: 'ALTA',
                    medications: ['AAS', 'Ibuprofeno'],
                    description: 'Aumenta risco de sangramento.',
                    recommendation: 'Converse com o médico.',
                },
                { severity: 'alta', medications: [], description: 'Sem medicamentos' }, // descartado
            ],
        });
        expect(report.summary).toBe('Dois alertas encontrados.');
        expect(report.duplicates).toHaveLength(1);
        expect(report.duplicates[0].medications).toEqual(['Dipirona', 'Novalgina']);
        expect(report.interactions).toHaveLength(1);
        // severity inválida cai para 'moderada' (padrão seguro)
        expect(report.interactions[0].severity).toBe('moderada');
    });

    it('preserva somente fontes identificadas e datas fornecidas, sem inventar metadados', () => {
        const report = sanitizeInteractionReport({
            sources: [
                { name: 'Bula oficial do medicamento', date: 'Edição 2025' },
                { name: '', date: '2026-01-01' },
                { name: 'Fonte sem data', date: 2026 },
            ],
        });
        expect(report.sources).toEqual([
            { name: 'Bula oficial do medicamento', date: 'Edição 2025' },
            { name: 'Fonte sem data', date: '' },
        ]);
    });

    it('limita listas e descarta itens não-objetos', () => {
        const report = sanitizeInteractionReport({
            duplicates: [null, 'x', { activeIngredient: 'X', medications: ['A', 'B'] }],
            interactions: [42, { severity: 'baixa', medications: ['C'], description: 'Descoberta.' }],
        });
        expect(report.duplicates).toHaveLength(1);
        expect(report.interactions).toHaveLength(1);
        expect(report.interactions[0].severity).toBe('baixa');
    });
});

describe('sanitizeMedicationGuide', () => {
    it('devolve guia vazio para entrada inesperada', () => {
        expect(sanitizeMedicationGuide(undefined)).toEqual({
            whatFor: '',
            howToUse: '',
            commonSideEffects: [],
            warnings: [],
            note: '',
        });
    });

    it('normaliza textos e listas', () => {
        const guide = sanitizeMedicationGuide({
            whatFor: '  Trata dor e febre. ',
            howToUse: 'Tomar com água.',
            commonSideEffects: ['Náusea', '', '   ', 'Sonolência'],
            warnings: ['Evite álcool', 42, 'Gravidez: consulte o médico'],
            note: 'Consulte a bula.',
        });
        expect(guide.whatFor).toBe('Trata dor e febre.');
        expect(guide.commonSideEffects).toEqual(['Náusea', 'Sonolência']);
        expect(guide.warnings).toEqual(['Evite álcool', 'Gravidez: consulte o médico']);
    });
});
